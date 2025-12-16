"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Chat = {
  message: string;
  reply: string;
};

export default function ChatAI() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ AMBIL RIWAYAT CHAT SAAT HALAMAN DIBUKA
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/chat/history", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil riwayat chat");
        return res.json();
      })
      .then((data) => setChatHistory(data.chats || []))
      .catch(() => setError("Gagal memuat riwayat chat"));
  }, []);

  // ✅ KIRIM CHAT KE AI
  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Gagal mengirim pesan");

      const data = await res.json();

      // ⬇️ update history langsung (tanpa refresh)
      setChatHistory((prev) => [
        ...prev,
        { message, reply: data.reply },
      ]);

      setMessage("");
    } catch (err) {
      setError("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* ERROR MESSAGE */}
      {error && (
        <div className="mb-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* RIWAYAT CHAT */}
      <div className="mb-6 space-y-4">
        {chatHistory.map((chat, i) => (
          <div
            key={i}
            className="p-4 border rounded-lg bg-muted"
          >
            <p className="font-semibold">User</p>
            <p className="mb-2">{chat.message}</p>

            <p className="font-semibold">AI</p>
            <p>{chat.reply}</p>
          </div>
        ))}

        {chatHistory.length === 0 && (
          <p className="text-sm text-gray-500">
            Belum ada percakapan.
          </p>
        )}
      </div>

      {/* INPUT */}
      <Textarea
        placeholder="Tanya materi..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={loading}
      />

      <Button
        onClick={sendMessage}
        className="mt-3"
        disabled={loading}
      >
        {loading ? "Mengirim..." : "Kirim"}
      </Button>
    </div>
  );
}
