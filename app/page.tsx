"use client";

import { Bot, MessageSquare, FileText, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-8">
          <Bot className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-4">
          AI Study Assistant
        </h1>

        <p className="text-xl text-muted-foreground text-center max-w-lg mb-8">
          Asisten belajar AI untuk mahasiswa. Tanya apa saja, ringkas PDF, dan buat jadwal belajar.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-12">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <MessageSquare className="w-8 h-8 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Chat AI</h3>
            <p className="text-sm text-muted-foreground">
              Tanya apa saja tentang materi pelajaran
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <FileText className="w-8 h-8 text-cyan-500 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Ringkas PDF</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDF dan dapatkan ringkasan otomatis
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <Calendar className="w-8 h-8 text-violet-500 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Study Planner</h3>
            <p className="text-sm text-muted-foreground">
              Buat jadwal belajar yang terstruktur
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/chat"
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            Mulai Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="px-8 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition-colors"
          >
            Login / Daftar
          </Link>
        </div>
      </div>
    </div>
  );
}
