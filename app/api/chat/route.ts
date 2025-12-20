import OpenAI from "openai";
import { NextResponse } from "next/server";
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

          // Validasi user exists
          if (userId) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
            });

            if (user) {
              isGuest = false;
            }
          }
        } catch {
          // Token invalid, treat as guest
          isGuest = true;
        }
      }
    }

    // 2️⃣ AMBIL MESSAGE DARI BODY
    const { message, guestChatCount } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message wajib diisi" },
        { status: 400 }
      );
    }

    // 3️⃣ CHECK GUEST LIMIT
    if (isGuest && guestChatCount >= GUEST_CHAT_LIMIT) {
      return NextResponse.json(
        {
          error: "Batas chat gratis tercapai",
          requireLogin: true,
          message: "Anda telah mencapai batas 7 chat gratis. Silakan login atau daftar untuk chat tanpa batas!"
        },
        { status: 403 }
      );
    }

    // 4️⃣ GET CHAT HISTORY (only for logged in users)
    let conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
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
- Gunakan inline code (\`kode\`) untuk nama fungsi, variabel, atau perintah`,
    });

    // Get history only for logged in users
    if (!isGuest && userId) {
      const chatHistory = await prisma.chat.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const reversedHistory = chatHistory.reverse();

      const pdfUploads: { fileName: string; text: string }[] = [];
      for (const chat of reversedHistory) {
        if (typeof chat.message === "string" && chat.message.startsWith("PDF_UPLOAD:")) {
          const parts = chat.message.split("\n\n");
          const header = parts.shift() || "";
          const fileName = header.replace(/^PDF_UPLOAD:/, "").trim();
          const text = parts.join("\n\n");
          pdfUploads.push({ fileName, text });
        } else {
          conversationMessages.push({ role: "user", content: chat.message });
          conversationMessages.push({ role: "assistant", content: chat.reply });
        }
      }

      // Add PDF context if available
      if (pdfUploads.length > 0) {
        const tokens: string[] = (message || "")
          .toLowerCase()
          .split(/\W+/)
          .filter((t: string) => t.length > 2);

        const maxSnippetsPerPdf = 6;

        for (const pdf of pdfUploads) {
          const sentences = pdf.text.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter(Boolean);

          const scored = sentences.map((s: string) => {
            const low = s.toLowerCase();
            let score = 0;
            for (const t of tokens) {
              if (low.includes(t)) score += 1;
            }
            return { s, score };
          });

          scored.sort((a, b) => b.score - a.score);
          const top = scored.filter((x) => x.score > 0).slice(0, maxSnippetsPerPdf).map((x) => x.s);

          if (top.length > 0) {
            conversationMessages.push({
              role: "system",
              content: `Konteks dari PDF yang diupload (${pdf.fileName}):\n${top.join("\n\n")}`,
            });
          }
        }
      }
    }

    // Add current message
    conversationMessages.push({ role: "user", content: message });

    // 5️⃣ SEND TO OPENAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationMessages,
    });

    // Keep markdown formatting for proper rendering
    const aiReply = (aiResponse.choices[0].message.content ?? "").trim();

    // 6️⃣ SAVE TO DATABASE (only for logged in users)
    if (!isGuest && userId) {
      await prisma.chat.create({
        data: {
          message,
          reply: aiReply,
          userId,
        },
      });
    }

    // 7️⃣ RESPONSE
    return NextResponse.json({
      reply: aiReply,
      isGuest,
      remainingChats: isGuest ? GUEST_CHAT_LIMIT - (guestChatCount + 1) : null,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
