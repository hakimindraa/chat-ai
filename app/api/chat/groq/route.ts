import { groq, DEFAULT_GROQ_MODEL } from "@/lib/groq";
import { prisma } from "@/lib/prisma";

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

        // 2️⃣ GET MESSAGE & CONTEXT
        const { message, context } = await req.json();

        if (!message) {
            return new Response(JSON.stringify({ error: "Message is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ PREPARE MESSAGES
        const today = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

        // System prompt with RAG context if available
        let systemPrompt = `Kamu adalah asisten belajar mahasiswa bernama AI Study Assistant yang menggunakan Llama AI.
GAYA BICARA & INTERAKSI:
- Santai, ramah, dan bersahabat (seperti teman belajar yang pintar).
- Gunakan emoji sesekali agar tidak kaku (seperti 👋, ✨, 🚀).
- **PENTING:** Selalu akhiri jawaban dengan pertanyaan balik yang relevan untuk menjaga percakapan tetap mengalir. Contoh: 'Kamu sendiri gimana?', 'Ada bagian yang bingung?', 'Mau contoh lain?'
- Jangan terlalu formal, tapi tetap sopan.

INFORMASI PENTING:
- Tanggal hari ini: ${today}
- Model: Llama 3.3 via Groq

FORMAT JAWABAN:
- Gunakan markdown untuk memformat jawaban dengan baik
- Untuk kode program, gunakan code block dengan bahasa yang sesuai
- Gunakan heading (##, ###) untuk membagi bagian
- Gunakan bullet points dan numbered lists untuk poin-poin

FORMAT MATEMATIKA:
- Untuk rumus matematika, gunakan format LaTeX
- Rumus inline: gunakan $...$, contoh: $x^2 + y^2 = z^2$
- Rumus block: gunakan $$...$$`;

        // Add RAG context if available
        if (context && context.length > 0) {
            systemPrompt += `\n\nKONTEKS DARI KNOWLEDGE BASE (gunakan informasi ini untuk menjawab):
${context}

PENTING: Prioritaskan informasi dari knowledge base di atas untuk menjawab pertanyaan.`;
        }

        conversationMessages.push({
            role: "system",
            content: systemPrompt,
        });

        // Get chat history for logged in users
        if (!isGuest && userId) {
            const chatHistory = await prisma.chat.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 10,
            });

            const reversedHistory = chatHistory.reverse();

            for (const chat of reversedHistory) {
                if (!chat.message.startsWith("PDF_UPLOAD:") && !chat.message.startsWith("[IMAGE]")) {
                    conversationMessages.push({ role: "user", content: chat.message });
                    conversationMessages.push({ role: "assistant", content: chat.reply });
                }
            }
        }

        conversationMessages.push({ role: "user", content: message });

        // 4️⃣ CREATE STREAMING RESPONSE
        const stream = await groq.chat.completions.create({
            model: DEFAULT_GROQ_MODEL,
            messages: conversationMessages,
            stream: true,
        });

        // 5️⃣ CREATE READABLE STREAM
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

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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
