import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const chats = await prisma.chat.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    return NextResponse.json({ error: "Token invalid" }, { status: 401 });
  }
}

// DELETE - Hapus chat by ID atau hapus semua chat
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      // Hapus semua chat user
      await prisma.chat.deleteMany({
        where: { userId: decoded.userId }
      });
      return NextResponse.json({ message: "Semua chat berhasil dihapus" });
    }

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID diperlukan" }, { status: 400 });
    }

    const chatIdInt = parseInt(chatId, 10);
    if (isNaN(chatIdInt)) {
      return NextResponse.json({ error: "Chat ID tidak valid" }, { status: 400 });
    }

    // Hapus chat spesifik (pastikan milik user ini)
    const chat = await prisma.chat.findFirst({
      where: { id: chatIdInt, userId: decoded.userId }
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat tidak ditemukan" }, { status: 404 });
    }

    await prisma.chat.delete({
      where: { id: chatIdInt }
    });

    return NextResponse.json({ message: "Chat berhasil dihapus" });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json({ error: "Gagal menghapus chat" }, { status: 500 });
  }
}
