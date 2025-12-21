import { prisma } from "@/lib/prisma";
import { findSimilarDocuments } from "@/lib/embedding";

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
                    // Guest user, no knowledge base access
                }
            }
        }

        // 2️⃣ GET QUERY
        const { query, topK = 3 } = await req.json();

        if (!query) {
            return new Response(JSON.stringify({ error: "Query diperlukan" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3️⃣ SEMANTIC SEARCH IN KNOWLEDGE BASE (PRO RAG)
        let results: { id: number; content: string; score: number }[] = [];

        if (userId) {
            const knowledge = await prisma.knowledge.findMany({
                where: { userId },
                select: {
                    id: true,
                    content: true,
                    embedding: true,
                },
            });

            if (knowledge.length > 0) {
                // Use AI-powered semantic search
                results = await findSimilarDocuments(
                    query,
                    knowledge.map(k => ({
                        id: k.id,
                        content: k.content,
                        embedding: k.embedding || undefined,
                    })),
                    topK
                );
            }
        }

        // 4️⃣ FORMAT CONTEXT FOR LLM
        let context = "";
        if (results.length > 0) {
            context = results
                .map((r, i) => `[Dokumen ${i + 1} - Relevansi: ${Math.round(r.score * 100)}%]\n${r.content}`)
                .join("\n\n---\n\n");
        }

        return new Response(JSON.stringify({
            results,
            context,
            hasResults: results.length > 0,
            proRag: true,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Knowledge Search Error:", error);
        return new Response(JSON.stringify({ error: "Gagal mencari di knowledge base" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

