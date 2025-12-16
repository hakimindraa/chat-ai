"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Paperclip, 
  Loader2, 
  FileText, 
  X, 
  Copy, 
  Check,
  Sparkles,
  BookOpen,
  FileQuestion,
  PenTool,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "./MarkdownRenderer";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "pdf";
  fileName?: string;
};

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (message: string, pdfFile?: File) => Promise<void>;
  isLoading: boolean;
  isGuest?: boolean;
  guestChatCount?: number;
  guestChatLimit?: number;
}

export default function ChatArea({
  messages,
  onSendMessage,
  isLoading,
  isGuest = false,
  guestChatCount = 0,
  guestChatLimit = 7,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [stagedPdf, setStagedPdf] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !stagedPdf) || isLoading) return;

    const message = input;
    const pdfToSend = stagedPdf;
    setInput("");
    setStagedPdf(null);
    await onSendMessage(message, pdfToSend || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setStagedPdf(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeStagedPdf = () => {
    setStagedPdf(null);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const quickActions = [
    { icon: BookOpen, label: "Explain concept", prompt: "Explain the concept of", color: "from-blue-500 to-cyan-500" },
    { icon: FileQuestion, label: "Summarize", prompt: "Summarize this topic:", color: "from-purple-500 to-pink-500" },
    { icon: PenTool, label: "Practice quiz", prompt: "Create a practice quiz about", color: "from-orange-500 to-red-500" },
    { icon: Zap, label: "Quick tips", prompt: "Give me quick tips for", color: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] bg-background overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4 pt-16 lg:pt-0 animate-fade-in">
            {/* Hero Section */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center">
              <span className="gradient-text">Study AI</span>
            </h1>
            <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base px-4 mb-4">
              Your intelligent study companion. Ask questions, summarize documents, or get help with any topic.
            </p>

            {/* Guest Mode Info */}
            {isGuest && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <span className="text-xs text-primary font-medium">
                  Mode Tamu: {guestChatLimit - guestChatCount} chat tersisa
                </span>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-md w-full px-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInput(action.prompt + " ")}
                  className="group p-4 rounded-2xl bg-card border border-border hover:border-primary/30 
                             hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 
                             text-left active:scale-[0.98]"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} 
                                  flex items-center justify-center mb-3 
                                  group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-medium text-foreground text-sm">{action.label}</p>
                </button>
              ))}
            </div>

            {/* PDF Upload Hint - only for logged in users */}
            {!isGuest && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full 
                           bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground
                           text-sm transition-all duration-200"
              >
                <Paperclip className="w-4 h-4" />
                <span>Upload PDF to analyze</span>
              </button>
            )}
            {isGuest && (
              <p className="mt-6 text-xs text-muted-foreground text-center">
                Login untuk menggunakan fitur upload PDF
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 pt-16 lg:pt-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 mb-6 animate-fade-in ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 relative group ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card border border-border shadow-sm"
                  }`}
                >
                  {message.type === "pdf" && message.fileName && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-current/10">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium truncate">{message.fileName}</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
                  </div>
                  
                  {message.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute -bottom-7 left-0 opacity-0 group-hover:opacity-100 
                                 flex items-center gap-1.5 text-xs text-muted-foreground 
                                 hover:text-foreground transition-all duration-200 px-2 py-1 rounded-lg
                                 hover:bg-muted"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-white text-xs font-semibold">You</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 mb-6 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4 text-white animate-pulse-soft" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-lg p-3 sm:p-4 pb-safe">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {/* Staged PDF Preview */}
          {stagedPdf && (
            <div className="mb-3 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 animate-fade-in">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{stagedPdf.name}</p>
                <p className="text-xs text-muted-foreground">Ready to analyze</p>
              </div>
              <button
                type="button"
                onClick={removeStagedPdf}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="relative flex items-end gap-2 bg-muted/50 border border-border rounded-2xl px-3 py-2 
                          focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl hover:bg-accent transition-all duration-200 ${
                stagedPdf ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Upload PDF"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={stagedPdf ? "What should I do with this PDF?" : "Ask me anything..."}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-foreground 
                         placeholder:text-muted-foreground text-sm py-2 min-h-[40px]"
              style={{ maxHeight: "160px" }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !stagedPdf) || isLoading}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                (input.trim() || stagedPdf) && !isLoading
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60 mt-3">
            Study AI can make mistakes. Please verify important information.
          </p>
        </form>
      </div>
    </div>
  );
}
