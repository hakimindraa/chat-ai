import { groq, DEFAULT_GROQ_MODEL } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { findSimilarDocuments } from "@/lib/embedding";
import { expandQuery } from "@/lib/ai/query";
import {
    isDocumentQuery,
    TOKEN_CONFIG,
    TEMPERATURE_CONFIG,
    RAG_CONFIG,
    logAI
} from "@/lib/ai/config";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

export async function POST(req: Request) {
    try {
        // 1️⃣ CHECK AUTH
        const authHeader = req.headers.get("authorization");
        let userId: number | null = null;
        let isGuest = true;

        if (authHeader) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "null" && token !== "undefined") {
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                    userId = decoded.userId;
                    if (userId) {
                        const user = await prisma.user.findUnique({ where: { id: userId } });
                        if (user) isGuest = false;
                    }
                } catch {
                    isGuest = true;
                }
            }
        }

        // 2️⃣ GET MESSAGE AND CONVERSATION HISTORY
        const { message, context: frontendContext, conversationHistory } = await req.json();

        if (!message) {
            return new Response(JSON.stringify({ error: "Message is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ SEARCH KNOWLEDGE BASE WITH QUERY EXPANSION (PRO RAG)
        let knowledgeContext = frontendContext || "";
        let hasRagContext = frontendContext && frontendContext.length > 0;
        const userIsAskingAboutDocs = isDocumentQuery(message);

        // If user is logged in and no context from frontend, search knowledge ourselves
        if (userId && !hasRagContext) {
            try {
                const knowledge = await prisma.knowledge.findMany({
                    where: { userId },
                    select: {
                        id: true,
                        content: true,
                        embedding: true,
                    },
                });

                logAI({
                    level: "info",
                    event: "GROQ_RAG_SEARCH_START",
                    userId,
                    metadata: {
                        documentCount: knowledge.length,
                        isDocumentQuery: userIsAskingAboutDocs
                    }
                });

                if (knowledge.length > 0) {
                    // 🔥 QUERY EXPANSION - The key improvement!
                    const { expanded, wasExpanded } = await expandQuery(message);
                    const searchQuery = wasExpanded ? expanded : message;

                    logAI({
                        level: "info",
                        event: "QUERY_EXPANSION_RESULT",
                        userId,
                        metadata: {
                            original: message,
                            expanded: searchQuery,
                            wasExpanded
                        }
                    });

                    const results = await findSimilarDocuments(
                        searchQuery,
                        knowledge.map(k => ({
                            id: k.id,
                            content: k.content,
                            embedding: k.embedding || undefined,
                        })),
                        RAG_CONFIG.TOP_K
                    );

                    if (results.length > 0) {
                        hasRagContext = true;
                        knowledgeContext = results
                            .map((r, i) => `[Dokumen ${i + 1} - Relevansi: ${Math.round(r.score * 100)}%]\n${r.content}`)
                            .join("\n\n---\n\n");

                        logAI({
                            level: "info",
                            event: "GROQ_RAG_CONTEXT_FOUND",
                            userId,
                            ragUsed: true,
                            contextFound: true,
                            metadata: {
                                resultCount: results.length,
                                topScore: results[0]?.score
                            }
                        });
                    } else {
                        logAI({
                            level: "warn",
                            event: "GROQ_RAG_NO_RELEVANT_CONTEXT",
                            userId,
                            ragUsed: true,
                            contextFound: false,
                            metadata: { isDocumentQuery: userIsAskingAboutDocs }
                        });
                    }
                }
            } catch (error) {
                logAI({
                    level: "error",
                    event: "GROQ_RAG_SEARCH_ERROR",
                    userId,
                    error: String(error)
                });
            }
        }

        // 4️⃣ PREPARE MESSAGES WITH STRICT RAG PROMPT
        const today = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

        // Use the same strict system prompt as stream/route.ts
        const systemPrompt = buildSystemPrompt({
            model: "llama",
            isGuest,
            today,
            ragContext: knowledgeContext,
            hasRagContext: hasRagContext,
            isDocumentQuery: userIsAskingAboutDocs,
        });

        conversationMessages.push({
            role: "system",
            content: systemPrompt,
        });

        // 🔥 PRIORITIZE CURRENT SESSION HISTORY from frontend (for context memory)
        if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            // Use frontend conversation history (current session - not yet saved to DB)
            for (const msg of conversationHistory) {
                if (msg.role && msg.content) {
                    conversationMessages.push({
                        role: msg.role as "user" | "assistant",
                        content: msg.content
                    });
                }
            }
        } else if (!isGuest && userId) {
            // Fallback to database history if no frontend history
            const chatHistory = await prisma.chat.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: TOKEN_CONFIG.HISTORY_LIMIT,
            });

            const reversedHistory = chatHistory.reverse();

            for (const chat of reversedHistory) {
                if (!chat.message.startsWith("PDF_UPLOAD:") && !chat.message.startsWith("[IMAGE]")) {
                    conversationMessages.push({ role: "user", content: chat.message.replace("[LLAMA] ", "") });
                    conversationMessages.push({ role: "assistant", content: chat.reply });
                }
            }
        }

        conversationMessages.push({ role: "user", content: message });

        // 5️⃣ CREATE STREAMING RESPONSE
        // Use lower temperature when RAG context is available for better accuracy
        const temperature = hasRagContext ? TEMPERATURE_CONFIG.RAG : TEMPERATURE_CONFIG.GENERAL;

        const stream = await groq.chat.completions.create({
            model: DEFAULT_GROQ_MODEL,
            messages: conversationMessages,
            stream: true,
            temperature: temperature,
            max_tokens: TOKEN_CONFIG.MAX_OUTPUT,
        });

        // 6️⃣ CREATE READABLE STREAM
        let fullResponse = "";
        const userIdForSave = userId;
        const isGuestForSave = isGuest;
        const messageForSave = message;

        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ragUsed: hasRagContext })}\n\n`));
                    controller.close();

                    // Save to database
                    if (!isGuestForSave && userIdForSave) {
                        await prisma.chat.create({
                            data: {
                                message: `[LLAMA] ${messageForSave}`,
                                reply: fullResponse.trim(),
                                userId: userIdForSave,
                            },
                        });
                    }
                } catch (error) {
                    console.error("Streaming error:", error);
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Streaming error" })}\n\n`)
                    );
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Rag-Used": hasRagContext ? "true" : "false",
            },
        });
    } catch (error: any) {
        console.error("Groq API Error:", error);

        // Handle rate limit
        if (error?.status === 429) {
            return new Response(JSON.stringify({
                error: "⚠️ Rate limit Groq tercapai. Coba lagi dalam beberapa saat.",
                isRateLimit: true
            }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Terjadi kesalahan pada Llama AI. Silakan coba lagi." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
