import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

// GET - Get user settings
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
            // Return default settings for guests
            return new Response(JSON.stringify({
                modelPreference: "auto",
                useKnowledge: false,
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Get or create settings
        let settings = await prisma.userSettings.findUnique({
            where: { userId },
        });

        if (!settings) {
            settings = await prisma.userSettings.create({
                data: {
                    userId,
                    modelPreference: "auto",
                    useKnowledge: true,
                },
            });
        }

        return new Response(JSON.stringify({
            modelPreference: settings.modelPreference,
            useKnowledge: settings.useKnowledge,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Settings GET Error:", error);
        return new Response(JSON.stringify({ error: "Gagal mengambil settings" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// PUT - Update user settings
export async function PUT(req: Request) {
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

        const { modelPreference, useKnowledge } = await req.json();

        const settings = await prisma.userSettings.upsert({
            where: { userId },
            update: {
                ...(modelPreference !== undefined && { modelPreference }),
                ...(useKnowledge !== undefined && { useKnowledge }),
            },
            create: {
                userId,
                modelPreference: modelPreference || "auto",
                useKnowledge: useKnowledge !== undefined ? useKnowledge : true,
            },
        });

        return new Response(JSON.stringify({
            message: "Settings berhasil diupdate",
            modelPreference: settings.modelPreference,
            useKnowledge: settings.useKnowledge,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Settings PUT Error:", error);
        return new Response(JSON.stringify({ error: "Gagal mengupdate settings" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
