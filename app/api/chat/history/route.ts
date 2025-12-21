import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

export async function GET(req: Request) {
  try {
    let userId: number | null = null;

    // Try JWT token first (for email/password users)
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          userId = decoded.userId;
        } catch {
          // Token invalid, will try NextAuth
        }
      }
    }

    // Try NextAuth session (for Google OAuth users)
    if (!userId) {
      const session = await auth();
      if (session?.user?.id) {
        userId = parseInt(session.user.id, 10);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Get chat history error:", error);
    return NextResponse.json({ error: "Token invalid" }, { status: 401 });
  }
}

// DELETE - Hapus chat by ID atau hapus semua chat
export async function DELETE(req: Request) {
  try {
    let userId: number | null = null;

    // Try JWT token first (for email/password users)
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          userId = decoded.userId;
        } catch {
          // Token invalid, will try NextAuth
        }
      }
    }

    // Try NextAuth session (for Google OAuth users)
    if (!userId) {
      const session = await auth();
      if (session?.user?.id) {
        userId = parseInt(session.user.id, 10);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      // Hapus semua chat user
      await prisma.chat.deleteMany({
        where: { userId }
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
      where: { id: chatIdInt, userId }
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

