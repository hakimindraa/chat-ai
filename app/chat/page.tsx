"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/chat/Sidebar";
import ChatArea from "@/components/chat/ChatArea";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "pdf";
  fileName?: string;
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

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [conversationGroups, setConversationGroups] = useState<ConversationGroup[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadChatHistory();
  }, [router]);

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chat/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const chats = data.chats || [];
        setChatList(chats);
        
        // Group chats - each chat is its own conversation for simplicity
        // Or you could group by date/session
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
    
    // Find the chat in the list and load its messages
    const selectedChat = chatList.find(chat => chat.id === id);
    if (selectedChat) {
      // Convert the chat to messages format
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
        // Jika chat yang dihapus adalah yang sedang aktif, reset tampilan
        if (activeChat === id) {
          setMessages([]);
          setActiveChat(null);
        }
        // Refresh chat list
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

  const handleSendMessage = async (message: string, pdfFile?: File) => {
    // Jika ada PDF, kirim PDF + message bersama
    if (pdfFile) {
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

    // Jika hanya message tanpa PDF
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

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

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        type: "text",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh chat list
      await loadChatHistory();
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden fixed inset-0">
      <Sidebar
        chats={chatList}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onDeleteAllChats={handleDeleteAllChats}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
