import OpenAI from "openai";
import { groq, DEFAULT_GROQ_MODEL } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { findSimilarDocuments } from "@/lib/embedding";
import { auth } from "@/auth";
import {
    RAG_CONFIG,
    TOKEN_CONFIG,
    logAI,
    getTemperature,
    isDocumentQuery,
    isCodeQuery
} from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/prompts";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const GUEST_CHAT_LIMIT = 7;

export async function POST(req: Request) {
    const startTime = Date.now();

    try {
        // 1️⃣ CHECK AUTH - SUPPORT BOTH JWT AND NEXTAUTH
        let userId: number | null = null;
        let isGuest = true;

        // Try JWT token first
        const authHeader = req.headers.get("authorization");
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "null" && token !== "undefined") {
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                    userId = decoded.userId;

                    if (userId) {
                        const user = await prisma.user.findUnique({
                            where: { id: userId },
                        });

                        if (user) {
                            isGuest = false;
                        }
                    }
                } catch {
                    // Token invalid, will try NextAuth
                }
            }
        }

        // Try NextAuth session (for Google OAuth users)
        if (!userId) {
            const session = await auth();
            if (session?.user?.id) {
                userId = parseInt(session.user.id, 10);
                isGuest = false;
            }
        }

        // 2️⃣ AMBIL MESSAGE DAN CONVERSATION HISTORY DARI BODY
        const { message, guestChatCount, conversationHistory } = await req.json();

        if (!message) {
            return new Response(JSON.stringify({ error: "Message wajib diisi" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ CHECK GUEST LIMIT
        if (isGuest && guestChatCount >= GUEST_CHAT_LIMIT) {
            return new Response(
                JSON.stringify({
                    error: "Batas chat gratis tercapai",
                    requireLogin: true,
                }),
                { status: 403, headers: { "Content-Type": "application/json" } }
            );
        }

        // 4️⃣ SEARCH KNOWLEDGE BASE (PRO RAG)
        let knowledgeContext = "";
        let hasRagContext = false;
        const userIsAskingAboutDocs = isDocumentQuery(message);
        const userIsAskingCode = isCodeQuery(message);

        if (userId) {
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
                    event: "RAG_SEARCH_START",
                    userId,
                    metadata: {
                        documentCount: knowledge.length,
                        isDocumentQuery: userIsAskingAboutDocs
                    }
                });

                if (knowledge.length > 0) {
                    // Query Expansion for better RAG retrieval
                    const { expandQuery } = await import("@/lib/ai/query");
                    const { expanded, wasExpanded } = await expandQuery(message);
                    const searchQuery = wasExpanded ? expanded : message;

                    const results = await findSimilarDocuments(
                        searchQuery, // Use expanded query for search
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
                            event: "RAG_CONTEXT_FOUND",
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
                            event: "RAG_NO_RELEVANT_CONTEXT",
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
                    event: "RAG_SEARCH_ERROR",
                    userId,
                    error: String(error)
                });
            }
        }

        // 5️⃣ BUILD CONVERSATION MESSAGES
        const today = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        // Calculate temperature based on context
        const temperature = getTemperature(hasRagContext, userIsAskingCode);

        const buildConversationMessages = async (model: "gpt" | "llama") => {
            const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

            // Build system prompt using new modular approach
            const systemPrompt = buildSystemPrompt({
                model,
                isGuest,
                today,
                ragContext: knowledgeContext,
                hasRagContext,
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
            return conversationMessages;
        };

        // 6️⃣ TRY GPT FIRST, FALLBACK TO GROQ
        let stream: any;
        let usedModel: "gpt" | "llama" = "gpt";
        let isFallback = false;

        try {
            logAI({
                level: "info",
                event: "MODEL_CALL_START",
                userId: userId || undefined,
                model: "gpt-4o-mini",
                ragUsed: hasRagContext,
                metadata: { temperature }
            });

            const conversationMessages = await buildConversationMessages("gpt");
            stream = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: conversationMessages,
                stream: true,
                temperature: temperature,
                max_tokens: TOKEN_CONFIG.MAX_OUTPUT,
            });
        } catch (gptError: any) {
            // If GPT rate limited, fallback to Groq
            if (gptError?.status === 429 || gptError?.code === 'rate_limit_exceeded') {
                logAI({
                    level: "warn",
                    event: "MODEL_FALLBACK",
                    userId: userId || undefined,
                    model: "llama",
                    isFallback: true,
                    metadata: {
                        reason: "GPT rate limit",
                        originalError: gptError?.message
                    }
                });

                usedModel = "llama";
                isFallback = true;

                const conversationMessages = await buildConversationMessages("llama");
                stream = await groq.chat.completions.create({
                    model: DEFAULT_GROQ_MODEL,
                    messages: conversationMessages,
                    stream: true,
                    temperature: temperature,
                    max_tokens: TOKEN_CONFIG.MAX_OUTPUT,
                });
            } else {
                logAI({
                    level: "error",
                    event: "MODEL_CALL_ERROR",
                    userId: userId || undefined,
                    model: "gpt",
                    error: gptError?.message
                });
                throw gptError;
            }
        }

        // 6️⃣ CREATE READABLE STREAM
        let fullResponse = "";
        const userIdForSave = userId;
        const isGuestForSave = isGuest;
        const messageForSave = message;
        const modelForSave = usedModel;

        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // Send model info if fallback occurred
                    if (isFallback) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            info: "⚡ GPT rate limit - otomatis beralih ke Llama AI",
                            modelSwitch: true,
                            model: "llama"
                        })}\n\n`));
                    }

                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }

                    // Send done signal with model info and RAG status
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model: modelForSave, ragUsed: hasRagContext })}\n\n`));
                    controller.close();

                    // 7️⃣ SAVE TO DATABASE (after streaming completes)
                    if (!isGuestForSave && userIdForSave) {
                        await prisma.chat.create({
                            data: {
                                message: modelForSave === "llama" ? `[LLAMA] ${messageForSave}` : messageForSave,
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
                "X-Model-Used": usedModel,
            },
        });
    } catch (error: any) {
        console.error("Chat Stream API Error:", error);

        // Handle rate limit error (both GPT and Groq failed)
        if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
            const retryAfter = error?.headers?.get?.('retry-after') || '60';
            const minutes = Math.ceil(parseInt(retryAfter) / 60);

            return new Response(JSON.stringify({
                error: `⚠️ Rate limit tercapai. Coba lagi dalam ${minutes > 60 ? Math.ceil(minutes / 60) + ' jam' : minutes + ' menit'}.`,
                isRateLimit: true
            }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Handle other OpenAI errors
        if (error?.status === 401) {
            return new Response(JSON.stringify({
                error: "API key tidak valid. Hubungi administrator."
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (error?.status === 503) {
            return new Response(JSON.stringify({
                error: "Server AI sedang sibuk. Coba lagi dalam beberapa saat."
            }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Terjadi kesalahan pada server. Silakan coba lagi." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

