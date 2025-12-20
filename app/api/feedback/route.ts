import { prisma } from "@/lib/prisma";
import { simpleEmbed } from "@/lib/embedding";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

export async function POST(req: Request) {
    try {
        // 1️⃣ CHECK AUTH
        const authHeader = req.headers.get("authorization");
        let userId: number | null = null;

        if (authHeader) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "null" && token !== "undefined") {
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                    userId = decoded.userId;
                } catch {
                    return new Response(JSON.stringify({ error: "Token tidak valid" }), {
                        status: 401,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }
        }

        if (!userId) {
            return new Response(JSON.stringify({ error: "Login diperlukan untuk menyimpan feedback" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2️⃣ GET FEEDBACK DATA
        const { question, answer, isPositive } = await req.json();

        if (!question || !answer) {
            return new Response(JSON.stringify({ error: "Question dan answer diperlukan" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ IF POSITIVE FEEDBACK, SAVE TO KNOWLEDGE BASE
        if (isPositive) {
            // Create Q&A entry in knowledge base
            const content = `Pertanyaan: ${question}\n\nJawaban: ${answer}`;
            const embedding = simpleEmbed(content);

            await prisma.knowledge.create({
                data: {
                    title: `Q&A: ${question.substring(0, 50)}...`,
                    content: content,
                    embedding: JSON.stringify(embedding),
                    source: "feedback",
                    userId: userId,
                },
            });

            return new Response(JSON.stringify({
                message: "Terima kasih! Jawaban ini telah disimpan ke knowledge base Anda.",
                saved: true,
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 4️⃣ NEGATIVE FEEDBACK - Just acknowledge
        return new Response(JSON.stringify({
            message: "Terima kasih atas feedback Anda. Kami akan berusaha lebih baik.",
            saved: false,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Feedback Error:", error);
        return new Response(JSON.stringify({ error: "Gagal menyimpan feedback" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
