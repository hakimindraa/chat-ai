import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 1️⃣ AMBIL TOKEN DARI HEADER
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    const userId = decoded.userId;

    // Validasi user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan. Silakan login ulang." },
        { status: 401 }
      );
    }

    // 2️⃣ AMBIL MESSAGE DARI BODY
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message wajib diisi" },
        { status: 400 }
      );
    }

    // 3️⃣ AMBIL RIWAYAT CHAT UNTUK KONTEKS (10 pesan terakhir)
    const chatHistory = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Balik urutan agar dari yang lama ke baru
    const reversedHistory = chatHistory.reverse();

    // Bangun array messages dengan konteks percakapan sebelumnya
    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long", 
      year: "numeric"
    });
    
    const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content: `Kamu adalah asisten belajar mahasiswa bernama AI Study Assistant. Jawab dengan bahasa sederhana dan jelas. Kamu bisa mengingat percakapan sebelumnya dengan user.

INFORMASI PENTING (UPDATE TERBARU):
- Tanggal hari ini: ${today}
- Presiden Indonesia saat ini adalah Prabowo Subianto, dilantik pada 20 Oktober 2024
- Wakil Presiden Indonesia saat ini adalah Gibran Rakabuming Raka
- Joko Widodo (Jokowi) adalah presiden sebelumnya (2014-2024)

PENTING: Jangan gunakan format markdown seperti ###, **, *, atau simbol lainnya. Gunakan teks biasa saja dengan paragraf dan nomor jika perlu.`,
      },
    ];

    // Pisahkan riwayat biasa dan PDF upload
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

    // Jika ada PDF yang diupload, coba ambil potongan yang relevan
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

    // Tambahkan pesan baru dari user
    conversationMessages.push({ role: "user", content: message });

    // 4️⃣ KIRIM KE OPENAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationMessages,
    });

    // Clean markdown from response
    const rawReply = aiResponse.choices[0].message.content ?? "";
    const aiReply = rawReply
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    // 5️⃣ SIMPAN KE DATABASE
    await prisma.chat.create({
      data: {
        message,
        reply: aiReply,
        userId,
      },
    });

    // 6️⃣ RESPONSE KE FRONTEND
    return NextResponse.json({
      reply: aiReply,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
