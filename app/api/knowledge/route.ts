import { prisma } from "@/lib/prisma";
import { getEmbedding, chunkText } from "@/lib/embedding";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

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
        let fileType = "manual";

        // 3️⃣ PROCESS FILE IF UPLOADED (MULTI-FORMAT SUPPORT)
        if (file) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = file.name.toLowerCase();

            // PDF
            if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
                const pdfData = await pdfParse(buffer);
                textContent = pdfData.text;
                fileType = "pdf";
            }
            // Word (.docx)
            else if (
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                fileName.endsWith(".docx")
            ) {
                const result = await mammoth.extractRawText({ buffer });
                textContent = result.value;
                fileType = "docx";
            }
            // Excel (.xlsx, .xls)
            else if (
                file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                file.type === "application/vnd.ms-excel" ||
                fileName.endsWith(".xlsx") ||
                fileName.endsWith(".xls")
            ) {
                const workbook = XLSX.read(buffer, { type: "buffer" });
                const sheets: string[] = [];

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const csvData = XLSX.utils.sheet_to_csv(sheet);
                    sheets.push(`=== Sheet: ${sheetName} ===\n${csvData}`);
                }

                textContent = sheets.join("\n\n");
                fileType = "xlsx";
            }
            // PowerPoint (.pptx) - extract as XML text
            else if (
                file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
                fileName.endsWith(".pptx")
            ) {
                // For PowerPoint, we extract what we can (limited without specialized library)
                textContent = `[PowerPoint file: ${file.name}] - Untuk hasil terbaik, ekspor presentasi ke PDF terlebih dahulu.`;
                fileType = "pptx";
            }
            // Plain text
            else if (file.type.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
                textContent = await file.text();
                fileType = "text";
            }
            // Unsupported format
            else {
                return new Response(JSON.stringify({
                    error: "Format file tidak didukung. Gunakan PDF, Word (.docx), Excel (.xlsx), atau Text."
                }), {
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

        // 4️⃣ CHUNK AND EMBED WITH HUGGINGFACE (PRO RAG)
        const chunks = chunkText(textContent, 300, 50);
        const savedKnowledge = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Use HuggingFace AI embedding (semantic understanding)
            const embedding = await getEmbedding(chunk);

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
            message: `✅ Berhasil menyimpan ${savedKnowledge.length} dokumen dengan AI embedding`,
            count: savedKnowledge.length,
            proRag: true,
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
