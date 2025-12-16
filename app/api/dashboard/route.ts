import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // ✅ SEMENTARA: dummy userId (HARUS NUMBER)
    const userId = 1;

    const chatCount = await prisma.chat.count({
      where: { userId }
    });

    const pdfCount = await prisma.pdfSummary.count({
      where: { userId }
    });

    const studyPlanCount = await prisma.studyPlan.count({
      where: { userId }
    });

    return NextResponse.json({
      chatCount,
      pdfCount,
      studyPlanCount
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}
