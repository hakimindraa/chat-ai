import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const GUEST_CHAT_LIMIT = 7;

export async function POST(req: Request) {
    try {
        // 1️⃣ CHECK AUTH - SUPPORT GUEST MODE
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
                        const user = await prisma.user.findUnique({
                            where: { id: userId },
                        });

                        if (user) {
                            isGuest = false;
                        }
                    }
                } catch {
                    isGuest = true;
                }
            }
        }

        // 2️⃣ AMBIL MESSAGE DARI BODY
        const { message, guestChatCount } = await req.json();

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

        // 4️⃣ BUILD CONVERSATION MESSAGES
        let conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

        const today = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        conversationMessages.push({
            role: "system",
            content: `Kamu adalah asisten belajar mahasiswa bernama AI Study Assistant. Jawab dengan bahasa sederhana dan jelas. ${!isGuest ? "Kamu bisa mengingat percakapan sebelumnya dengan user." : ""}

INFORMASI PENTING (UPDATE TERBARU):
- Tanggal hari ini: ${today}
- Presiden Indonesia saat ini adalah Prabowo Subianto, dilantik pada 20 Oktober 2024
- Wakil Presiden Indonesia saat ini adalah Gibran Rakabuming Raka
- Joko Widodo (Jokowi) adalah presiden sebelumnya (2014-2024)

FORMAT JAWABAN:
- Gunakan markdown untuk memformat jawaban dengan baik
- Untuk kode program, SELALU gunakan code block dengan bahasa yang sesuai, contoh: \`\`\`php, \`\`\`python, \`\`\`javascript, dll
- Gunakan heading (##, ###) untuk membagi bagian
- Gunakan bullet points dan numbered lists untuk poin-poin
- Gunakan bold (**teks**) untuk penekanan penting
- Gunakan inline code (\`kode\`) untuk nama fungsi, variabel, atau perintah

FORMAT MATEMATIKA (PENTING):
- Untuk rumus matematika, SELALU gunakan format LaTeX
- Rumus inline: gunakan $...$, contoh: $x^2 + y^2 = z^2$
- Rumus block: gunakan $$...$$, contoh: $$\\frac{a}{b}$$
- Contoh: pangkat $x^2$, pecahan $\\frac{1}{2}$, akar $\\sqrt{x}$, integral $\\int_0^1 x\\,dx$`,
        });

        // Get history only for logged in users
        if (!isGuest && userId) {
            const chatHistory = await prisma.chat.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 10,
            });

            const reversedHistory = chatHistory.reverse();

            for (const chat of reversedHistory) {
                if (!chat.message.startsWith("PDF_UPLOAD:")) {
                    conversationMessages.push({ role: "user", content: chat.message });
                    conversationMessages.push({ role: "assistant", content: chat.reply });
                }
            }
        }

        conversationMessages.push({ role: "user", content: message });

        // 5️⃣ CREATE STREAMING RESPONSE
        const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversationMessages,
            stream: true,
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

                    // Send done signal
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                    controller.close();

                    // 7️⃣ SAVE TO DATABASE (after streaming completes)
                    if (!isGuestForSave && userIdForSave) {
                        await prisma.chat.create({
                            data: {
                                message: messageForSave,
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
        console.error("Chat Stream API Error:", error);

        // Handle rate limit error
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
                error: "Server OpenAI sedang sibuk. Coba lagi dalam beberapa saat."
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
