import { prisma } from "@/lib/prisma";
import { simpleEmbed, chunkText } from "@/lib/embedding";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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
            return new Response(JSON.stringify({ error: "Login diperlukan untuk upload knowledge" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2️⃣ GET FORM DATA
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const title = formData.get("title") as string || "Untitled";
        const content = formData.get("content") as string || "";
        const source = (formData.get("source") as string) || "manual";

        let textContent = content;

        // 3️⃣ PROCESS FILE IF UPLOADED
        if (file) {
            if (file.type === "application/pdf") {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const pdfData = await pdfParse(buffer);
                textContent = pdfData.text;
            } else if (file.type.startsWith("text/")) {
                textContent = await file.text();
            } else {
                return new Response(JSON.stringify({ error: "Format file tidak didukung. Gunakan PDF atau text." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        if (!textContent.trim()) {
            return new Response(JSON.stringify({ error: "Konten tidak boleh kosong" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 4️⃣ CHUNK AND EMBED
        const chunks = chunkText(textContent, 500, 50);
        const savedKnowledge = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = simpleEmbed(chunk);

            const knowledge = await prisma.knowledge.create({
                data: {
                    title: chunks.length > 1 ? `${title} (Part ${i + 1})` : title,
                    content: chunk,
                    embedding: JSON.stringify(embedding),
                    source: source,
                    userId: userId,
                },
            });

            savedKnowledge.push(knowledge);
        }

        return new Response(JSON.stringify({
            message: `Berhasil menyimpan ${savedKnowledge.length} dokumen ke knowledge base`,
            count: savedKnowledge.length,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Knowledge Upload Error:", error);
        return new Response(JSON.stringify({ error: "Gagal upload ke knowledge base" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// GET - List knowledge items
export async function GET(req: Request) {
    try {
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
            return new Response(JSON.stringify({ error: "Login diperlukan" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const knowledge = await prisma.knowledge.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                source: true,
                createdAt: true,
            },
        });

        return new Response(JSON.stringify(knowledge), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Knowledge List Error:", error);
        return new Response(JSON.stringify({ error: "Gagal mengambil data knowledge" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// DELETE - Remove knowledge item
export async function DELETE(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return new Response(JSON.stringify({ error: "ID diperlukan" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

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
            return new Response(JSON.stringify({ error: "Login diperlukan" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        await prisma.knowledge.delete({
            where: { id: parseInt(id), userId },
        });

        return new Response(JSON.stringify({ message: "Knowledge berhasil dihapus" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Knowledge Delete Error:", error);
        return new Response(JSON.stringify({ error: "Gagal menghapus knowledge" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
