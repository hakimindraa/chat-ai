"use client";

import { Bot, MessageSquare, FileText, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-background fixed inset-0">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center h-full px-4 py-6 overflow-hidden">
        {/* Logo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 sm:mb-6 shrink-0">
          <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground text-center mb-2 sm:mb-4">
          AI Study Assistant
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-lg mb-4 sm:mb-6 px-2">
          Asisten belajar AI untuk mahasiswa. Tanya apa saja, ringkas PDF, dan buat jadwal belajar.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 max-w-3xl w-full mb-4 sm:mb-8 px-2">
          <div className="p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mb-2 sm:mb-3" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">Chat AI</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tanya apa saja tentang materi pelajaran
            </p>
          </div>

          <div className="p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500 mb-2 sm:mb-3" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">Ringkas PDF</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Upload PDF dan dapatkan ringkasan otomatis
            </p>
          </div>

          <div className="p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-violet-500 mb-2 sm:mb-3" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">Study Planner</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Buat jadwal belajar yang terstruktur
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 shrink-0">
          <Link
            href="/chat"
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Mulai Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="px-8 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition-colors text-center"
          >
            Login / Daftar
          </Link>
        </div>
      </div>
    </div>
  );
}
