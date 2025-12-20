import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

        // 2️⃣ GET FORM DATA
        const formData = await req.formData();
        const image = formData.get("image") as File | null;
        const message = formData.get("message") as string || "Analisis gambar ini";

        if (!image) {
            return new Response(JSON.stringify({ error: "Gambar wajib diupload" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ CONVERT IMAGE TO BASE64
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");
        const mimeType = image.type || "image/jpeg";

        // 4️⃣ PREPARE MESSAGES FOR VISION API
        const today = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: `Kamu adalah asisten belajar mahasiswa bernama AI Study Assistant. Kamu bisa menganalisis gambar yang diberikan.

INFORMASI PENTING:
- Tanggal hari ini: ${today}

FORMAT JAWABAN:
- Gunakan markdown untuk memformat jawaban dengan baik
- Untuk soal matematika, tunjukkan langkah-langkah penyelesaian
- Untuk diagram/grafik, jelaskan komponen-komponennya
- Gunakan code block jika ada kode dalam gambar`,
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: message,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${base64Image}`,
                        },
                    },
                ],
            },
        ];

        // 5️⃣ SEND TO OPENAI WITH STREAMING
        const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            stream: true,
            max_tokens: 4096,
        });

        // 6️⃣ CREATE READABLE STREAM
        let fullResponse = "";
        const userIdForSave = userId;
        const isGuestForSave = isGuest;
        const messageForSave = `[IMAGE] ${message}`;

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
                                message: messageForSave,
                                reply: fullResponse.trim(),
                                userId: userIdForSave,
                            },
                        });
                    }
                } catch (error) {
                    console.error("Streaming error:", error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming error" })}\n\n`));
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
        console.error("Image API Error:", error);

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

        return new Response(JSON.stringify({ error: "Gagal menganalisis gambar. Silakan coba lagi." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
