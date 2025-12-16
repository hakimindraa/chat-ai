export const runtime = "nodejs";

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 🔐 Ambil token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("PDF Error: No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.error("PDF Error: No token found");
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (jwtError) {
      console.error("PDF Error: JWT verification failed", jwtError);
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
    }
    
    const userId = decoded.userId;

    // 📄 Ambil file dan message dari form upload
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error("PDF Error: Failed to parse form data", formError);
      return NextResponse.json({ error: "Gagal membaca form data" }, { status: 400 });
    }

    const file = formData.get("file") as File;
    const userMessage = formData.get("message") as string || "Ringkas isi PDF ini";

    if (!file) {
      console.error("PDF Error: No file in form data");
      return NextResponse.json(
        { error: "File PDF wajib diupload" },
        { status: 400 }
      );
    }

    console.log("PDF Upload: Processing file", file.name, "with message:", userMessage);

    // ✅ CONVERT FILE → BUFFER
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ✅ PARSE PDF
    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
    } catch (parseError) {
      console.error("PDF Error: Failed to parse PDF", parseError);
      return NextResponse.json(
        { error: "Gagal membaca file PDF. Pastikan file tidak corrupt." },
        { status: 400 }
      );
    }

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      console.error("PDF Error: No text extracted from PDF");
      return NextResponse.json(
        { error: "PDF tidak mengandung teks yang dapat dibaca" },
        { status: 400 }
      );
    }

    console.log("PDF Upload: Extracted text length:", pdfData.text.length);

    // 🤖 Kirim ke AI dengan instruksi user
    const pdfText = pdfData.text.slice(0, 15000); // Limit text untuk token
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Kamu adalah asisten belajar mahasiswa. Kamu akan menerima isi dari sebuah PDF dan instruksi dari user. Lakukan apa yang diminta user berdasarkan isi PDF tersebut.

PENTING: Jangan gunakan format markdown seperti ###, **, *, atau simbol lainnya. Gunakan teks biasa saja dengan paragraf dan nomor jika perlu.`,
        },
        {
          role: "user",
          content: `ISI PDF (${file.name}):\n${pdfText}\n\n---\n\nINSTRUKSI: ${userMessage}`,
        },
      ],
    });

    const rawReply = aiResponse.choices[0].message.content ?? "";
    const aiReply = rawReply
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    // 💾 Simpan ke database
    await prisma.chat.create({
      data: {
        message: `📄 ${file.name}: ${userMessage}`,
        reply: aiReply,
        userId,
      },
    });

    console.log("PDF Upload: Success for", file.name);

    return NextResponse.json({ 
      reply: aiReply,
      fileName: file.name 
    });
  } catch (error) {
    console.error("PDF API Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses PDF: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}
