"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Trash2,
  Settings,
  Sun,
  Moon,
  Sparkles,
  User2,
  LogIn,
  UserPlus,
  BookOpen,
  Upload,
  ChevronDown,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type ChatItem = {
  id: string;
  message: string;
  createdAt: string;
};

interface SidebarProps {
  chats: ChatItem[];
  activeChat: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onDeleteAllChats: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isGuest?: boolean;
  guestChatCount?: number;
  guestChatLimit?: number;
}

export default function Sidebar({
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onDeleteAllChats,
  isOpen,
  onToggle,
  isGuest = false,
  guestChatCount = 0,
  guestChatLimit = 7,
}: SidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);

  // Knowledge Base state
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [knowledgeList, setKnowledgeList] = useState<{ id: number; title: string }[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch knowledge list
  const fetchKnowledge = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingKnowledge(true);
    try {
      const res = await fetch("/api/knowledge", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeList(data.knowledge || []);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge:", error);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  // Handle file upload
  const handleUploadKnowledge = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Login diperlukan untuk upload dokumen");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success("Dokumen berhasil diupload!");
        fetchKnowledge();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal upload dokumen");
      }
    } catch (error) {
      toast.error("Gagal upload dokumen");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Handle delete knowledge
  const handleDeleteKnowledge = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Dokumen berhasil dihapus");
        setKnowledgeList(prev => prev.filter(k => k.id !== id));
      }
    } catch (error) {
      toast.error("Gagal menghapus dokumen");
    }
  };

  // Toggle knowledge section
  const toggleKnowledge = () => {
    if (!showKnowledge) {
      fetchKnowledge();
    }
    setShowKnowledge(!showKnowledge);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[280px] h-[100dvh] max-h-[100dvh] 
          bg-sidebar/80 backdrop-blur-xl border-r border-white/10
          flex flex-col overflow-hidden
          transform transition-all duration-300 ease-out
          shadow-2xl shadow-black/10
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo & New Chat */}
        <div className="p-4 space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground text-sm">Study AI</h1>
              <p className="text-[10px] text-sidebar-foreground/50">Powered by GPT-4</p>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onToggle();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-primary text-primary-foreground font-medium text-sm
                       hover:opacity-90 hover-lift hover-glow active:scale-[0.98]
                       shadow-lg shadow-primary/20 transition-all duration-300"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>New Chat</span>
          </button>

          {/* Knowledge Base Section */}
          {!isGuest && (
            <div className="mt-3">
              <button
                onClick={toggleKnowledge}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                           bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground
                           text-sm font-medium transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Knowledge Base</span>
                  {knowledgeList.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">
                      {knowledgeList.length}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showKnowledge ? "rotate-180" : ""}`} />
              </button>

              {/* Expandable Knowledge Section */}
              {showKnowledge && (
                <div className="mt-2 p-2 bg-sidebar-accent/30 rounded-xl space-y-2 animate-fade-in">
                  {/* Upload Button */}
                  <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                    bg-primary/10 hover:bg-primary/20 text-primary text-sm cursor-pointer
                                    transition-all duration-200 border border-dashed border-primary/30">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleUploadKnowledge}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                    {uploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Dokumen</span>
                      </>
                    )}
                  </label>

                  {/* Knowledge List */}
                  {loadingKnowledge ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : knowledgeList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Belum ada dokumen
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {knowledgeList.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 px-2 py-1.5 bg-background/50 rounded-lg group"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs text-foreground truncate flex-1">
                            {item.title}
                          </span>
                          <button
                            onClick={() => handleDeleteKnowledge(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 
                                       text-muted-foreground hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-3">
          {chats.length > 0 && (
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <span className="text-[11px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
                Recent Chats
              </span>
              <button
                onClick={onDeleteAllChats}
                className="text-[10px] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}

          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-sidebar-accent/50 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-sidebar-foreground/30" />
                </div>
                <p className="text-sm text-sidebar-foreground/50 font-medium">No conversations yet</p>
                <p className="text-xs text-sidebar-foreground/30 mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                >
                  <button
                    onClick={() => {
                      onSelectChat(chat.id);
                      if (window.innerWidth < 1024) onToggle();
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-left text-sm transition-all duration-200 pr-10
                      ${activeChat === chat.id
                        ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                    `}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0 opacity-50" />
                    <span className="truncate">
                      {chat.message.slice(0, 28)}
                      {chat.message.length > 28 ? "..." : ""}
                    </span>
                  </button>

                  {(hoveredChat === chat.id || activeChat === chat.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                                 text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-400/10
                                 transition-all duration-200"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="shrink-0 p-3 border-t border-sidebar-border space-y-1 pb-safe">
          {/* Guest Chat Counter */}
          {isGuest && (
            <div className="px-3 py-2 mb-2 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">Chat Gratis</span>
                <span className="text-xs font-bold text-primary">{guestChatCount}/{guestChatLimit}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(guestChatCount / guestChatLimit) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {mounted && (theme === "dark" ? (
                <Moon className="w-4 h-4 text-sidebar-foreground/50" />
              ) : (
                <Sun className="w-4 h-4 text-sidebar-foreground/50" />
              ))}
              <span className="text-sm text-sidebar-foreground/70">
                {mounted && (theme === "dark" ? "Dark" : "Light")} Mode
              </span>
            </div>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${theme === "dark" ? "bg-primary" : "bg-sidebar-accent"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm
                    transition-transform duration-200
                    ${theme === "dark" ? "left-6" : "left-1"}
                  `}
                />
              </button>
            )}
          </div>

          {/* Guest Mode - Login/Register buttons */}
          {isGuest ? (
            <div className="space-y-2 pt-2">
              <Link
                href="/register"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm
                         bg-primary text-primary-foreground font-medium
                         hover:opacity-90 transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftar Gratis</span>
              </Link>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm
                         border border-border text-sidebar-foreground/70 
                         hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
                         transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Settings */}
              <button
                onClick={() => {
                  router.push("/profile");
                  if (window.innerWidth < 1024) onToggle();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                           text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
                           transition-all duration-200"
              >
                <Settings className="w-4 h-4 opacity-50" />
                <span>Settings</span>
              </button>

              {/* User Info */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-sidebar-accent/30">
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-purple-500/80 flex items-center justify-center">
                      <User2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-sidebar-foreground truncate max-w-[120px]">
                      {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/40 truncate max-w-[120px]">
                      {session?.user?.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-red-400 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-card/80 backdrop-blur-sm border border-border
                   hover:bg-accent lg:hidden transition-all duration-200 shadow-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );
}
