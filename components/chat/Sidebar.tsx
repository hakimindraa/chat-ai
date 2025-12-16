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
  UserPlus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";

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
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[280px] h-[100dvh] max-h-[100dvh] bg-sidebar border-r border-sidebar-border
          flex flex-col overflow-hidden
          transform transition-all duration-300 ease-out
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
                       hover:opacity-90 transition-all duration-200 active:scale-[0.98]
                       shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>New Chat</span>
          </button>
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
                      ${
                        activeChat === chat.id
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-purple-500/80 flex items-center justify-center">
                    <User2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-sidebar-foreground truncate max-w-[120px]">
                      {userEmail.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/40 truncate max-w-[120px]">
                      {userEmail}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
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
