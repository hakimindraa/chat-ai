"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, FileText, LogOut, Menu, X, Trash2, Settings, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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
}: SidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Get user email from token
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "User");
      } catch {
        setUserEmail("User");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[280px] sm:w-72 bg-sidebar flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          shadow-xl lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                       bg-sidebar-accent hover:bg-sidebar-accent/80
                       text-sidebar-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {chats.length > 0 && (
            <div className="px-3 pb-2">
              <button
                onClick={onDeleteAllChats}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Hapus semua chat
              </button>
            </div>
          )}
          <div className="space-y-1">
            {chats.length === 0 ? (
              <p className="text-sm text-sidebar-foreground/50 px-3 py-2">
                Belum ada percakapan
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-left text-sm transition-colors pr-10
                      ${
                        activeChat === chat.id
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                      }
                    `}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {chat.message.slice(0, 30)}
                      {chat.message.length > 30 ? "..." : ""}
                    </span>
                  </button>
                  {/* Delete button - muncul saat hover */}
                  {(hoveredChat === chat.id || activeChat === chat.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                                 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-400/10
                                 transition-colors"
                      title="Hapus chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Section */}
        <div className="p-2 sm:p-3 border-t border-sidebar-border space-y-1 sm:space-y-2">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2">
            <span className="text-xs sm:text-sm text-sidebar-foreground/70">Tema</span>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 active:scale-95"
                title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Profile Link */}
          <button
            onClick={() => {
              router.push("/profile");
              onToggle();
            }}
            className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm
                       text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors active:scale-[0.98]"
          >
            <Settings className="w-4 h-4" />
            <span>Profile Settings</span>
          </button>

          {/* User Info */}
          <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs sm:text-sm text-sidebar-foreground truncate max-w-[120px] sm:max-w-[140px]">
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 active:scale-95"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-card hover:bg-accent
                   lg:hidden transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );
}
