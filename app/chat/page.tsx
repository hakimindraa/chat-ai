"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/chat/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import ModelSwitch from "@/components/chat/ModelSwitch";
import { LogIn, UserPlus, X, Sparkles } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "pdf" | "image";
  fileName?: string;
  imageUrl?: string;
  modelUsed?: "gpt" | "llama";
};

type ChatItem = {
  id: string;
  message: string;
  reply: string;
  createdAt: string;
};

// Group chats by conversation (for sidebar display)
type ConversationGroup = {
  id: string;
  firstMessage: string;
  messages: ChatItem[];
};

const GUEST_CHAT_LIMIT = 7;

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [conversationGroups, setConversationGroups] = useState<ConversationGroup[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guest mode state
  const [isGuest, setIsGuest] = useState(true);
  const [guestChatCount, setGuestChatCount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Model selection state
  const [modelPreference, setModelPreference] = useState<"auto" | "gpt" | "llama">("auto");

  // Check auth and load guest chat count
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined") {
      setIsGuest(false);
      loadChatHistory();
    } else {
      setIsGuest(true);
      // Load guest chat count from localStorage
      const savedCount = localStorage.getItem("guestChatCount");
      if (savedCount) {
        const count = parseInt(savedCount, 10);
        setGuestChatCount(count);
        if (count >= GUEST_CHAT_LIMIT) {
          setShowLoginPrompt(true);
        }
      }
    }
  }, []);

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/chat/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const chats = data.chats || [];
        setChatList(chats);

        const groups: ConversationGroup[] = chats.map((chat: ChatItem) => ({
          id: chat.id,
          firstMessage: chat.message,
          messages: [chat],
        }));
        setConversationGroups(groups);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChat(null);
    setSidebarOpen(false);
  };

  const handleSelectChat = async (id: string) => {
    setActiveChat(id);
    setSidebarOpen(false);

    const selectedChat = chatList.find(chat => chat.id === id);
    if (selectedChat) {
      const loadedMessages: Message[] = [
        {
          id: `${selectedChat.id}-user`,
          role: "user",
          content: selectedChat.message,
          type: "text",
        },
        {
          id: `${selectedChat.id}-assistant`,
          role: "assistant",
          content: selectedChat.reply,
          type: "text",
        },
      ];
      setMessages(loadedMessages);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm("Hapus chat ini?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/chat/history?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        if (activeChat === id) {
          setMessages([]);
          setActiveChat(null);
        }
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleDeleteAllChats = async () => {
    if (!confirm("Hapus SEMUA chat? Tindakan ini tidak dapat dibatalkan.")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chat/history?all=true", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMessages([]);
        setActiveChat(null);
        setChatList([]);
        setConversationGroups([]);
      }
    } catch (error) {
      console.error("Failed to delete all chats:", error);
    }
  };

  // Search knowledge base for RAG
  const searchKnowledge = async (query: string): Promise<{ context: string; hasResults: boolean }> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return { context: "", hasResults: false };

      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, topK: 3 }),
      });

      if (res.ok) {
        const data = await res.json();
        return { context: data.context || "", hasResults: data.hasResults || false };
      }
    } catch (error) {
      console.error("Knowledge search error:", error);
    }
    return { context: "", hasResults: false };
  };

  // Determine which model to use
  const determineModel = async (message: string): Promise<{ model: "gpt" | "llama"; context: string }> => {
    // If explicit preference, use that
    if (modelPreference === "gpt") return { model: "gpt", context: "" };
    if (modelPreference === "llama") {
      const { context } = await searchKnowledge(message);
      return { model: "llama", context };
    }

    // Auto mode: check knowledge base first
    const { context, hasResults } = await searchKnowledge(message);
    if (hasResults) {
      // Has relevant knowledge, use Llama with RAG
      return { model: "llama", context };
    }

    // No knowledge found, use GPT
    return { model: "gpt", context: "" };
  };

  const handleSendMessage = async (message: string, pdfFile?: File) => {
    // Check guest limit before sending
    if (isGuest && guestChatCount >= GUEST_CHAT_LIMIT) {
      setShowLoginPrompt(true);
      return;
    }

    // Handle PDF
    if (pdfFile) {
      // Guest cannot upload PDF
      if (isGuest) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Maaf, fitur upload PDF hanya tersedia untuk pengguna yang sudah login. Silakan login atau daftar untuk menggunakan fitur ini.",
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: message || "Proses PDF ini",
        type: "pdf",
        fileName: pdfFile.name,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", pdfFile);
        formData.append("message", message || "Ringkas isi PDF ini");

        const res = await fetch("/api/pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to process PDF");

        const data = await res.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply || data.message || "PDF berhasil diproses!",
          type: "text",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        await loadChatHistory();
      } catch (error) {
        console.error("Error processing PDF:", error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Maaf, gagal memproses PDF. Pastikan file valid dan coba lagi.",
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular message
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      type: "text",
    };

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      // Determine which model and context to use
      const { model, context } = await determineModel(message);

      // Choose API endpoint based on model
      const apiEndpoint = model === "llama" ? "/api/chat/groq" : "/api/chat/stream";

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" && token !== "undefined"
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          message,
          context: model === "llama" ? context : undefined,
          guestChatCount: isGuest ? guestChatCount : 0,
        }),
      });

      // Check for non-stream error responses
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403 && data.requireLogin) {
          setShowLoginPrompt(true);
          // Remove the messages since it wasn't processed
          setMessages((prev) => prev.slice(0, -2));
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to send message");
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                // Streaming complete
                break;
              }

              if (data.content) {
                fullContent += data.content;
                // Update the assistant message with new content and model used
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent, modelUsed: model }
                      : msg
                  )
                );
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Update guest chat count
      if (isGuest) {
        const newCount = guestChatCount + 1;
        setGuestChatCount(newCount);
        localStorage.setItem("guestChatCount", newCount.toString());

        if (newCount >= GUEST_CHAT_LIMIT) {
          setShowLoginPrompt(true);
        }
      } else {
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Update the assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Maaf, terjadi kesalahan. Silakan coba lagi." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    // Find the user message that came before this assistant message
    const messageIndex = messages.findIndex((m) => m.id === assistantMessageId);
    if (messageIndex <= 0) return;

    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== "user") return;

    // Clear the assistant message content and start regenerating
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId ? { ...msg, content: "" } : msg
      )
    );
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" && token !== "undefined"
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          message: userMessage.content,
          guestChatCount: isGuest ? guestChatCount : 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to regenerate");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error regenerating:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Maaf, gagal regenerate. Silakan coba lagi." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendImage = async (message: string, imageFile: File) => {
    // Check guest limit
    if (isGuest && guestChatCount >= GUEST_CHAT_LIMIT) {
      setShowLoginPrompt(true);
      return;
    }

    // Create image URL for preview
    const imageUrl = URL.createObjectURL(imageFile);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      type: "image",
      fileName: imageFile.name,
      imageUrl: imageUrl,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("message", message);

      const res = await fetch("/api/image", {
        method: "POST",
        headers: {
          ...(token && token !== "null" && token !== "undefined"
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to analyze image");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Update guest chat count
      if (isGuest) {
        const newCount = guestChatCount + 1;
        setGuestChatCount(newCount);
        localStorage.setItem("guestChatCount", newCount.toString());
        if (newCount >= GUEST_CHAT_LIMIT) {
          setShowLoginPrompt(true);
        }
      } else {
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Maaf, gagal menganalisis gambar. Silakan coba lagi." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden fixed inset-0 bg-background">
      {/* Background Gradient Orbs for Glassmorphism */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <Sidebar
        chats={chatList}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onDeleteAllChats={handleDeleteAllChats}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isGuest={isGuest}
        guestChatCount={guestChatCount}
        guestChatLimit={GUEST_CHAT_LIMIT}
      />
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendImage={handleSendImage}
        onRegenerate={handleRegenerate}
        isLoading={isLoading}
        isGuest={isGuest}
        guestChatCount={guestChatCount}
        guestChatLimit={GUEST_CHAT_LIMIT}
        modelPreference={modelPreference}
        onModelChange={setModelPreference}
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary to-purple-500 p-6 text-white">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold">Batas Chat Gratis Tercapai</h2>
              <p className="text-white/80 text-sm mt-1">
                Anda telah menggunakan {guestChatCount} dari {GUEST_CHAT_LIMIT} chat gratis
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-muted-foreground text-sm mb-6">
                Daftar atau login untuk menikmati fitur tanpa batas:
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  Chat tanpa batas
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  Upload dan analisis PDF
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  Riwayat chat tersimpan
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  AI mengingat percakapan sebelumnya
                </li>
              </ul>

              <div className="space-y-3">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  <UserPlus className="w-4 h-4" />
                  Daftar Gratis
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-accent transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sudah Punya Akun? Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
