"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, Bot, User, FileText, X, Copy, Check } from "lucide-react";
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
}

export default function ChatArea({
  messages,
  onSendMessage,
  isLoading,
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
      toast.success("Berhasil disalin!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Gagal menyalin teks");
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
      // Stage the PDF instead of uploading immediately
      setStagedPdf(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeStagedPdf = () => {
    setStagedPdf(null);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4 pt-16 lg:pt-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 sm:mb-6">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 text-center">
              AI Study Assistant
            </h1>
            <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base px-2">
              Tanyakan apa saja tentang materi pelajaranmu, atau upload PDF untuk diringkas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-6 sm:mt-8 max-w-lg w-full px-2">
              <button
                onClick={() => setInput("Jelaskan konsep machine learning")}
                className="p-3 sm:p-4 rounded-xl border border-border hover:bg-accent text-left transition-colors active:scale-[0.98]"
              >
                <p className="font-medium text-foreground text-xs sm:text-sm">💡 Jelaskan konsep</p>
                <p className="text-muted-foreground text-xs mt-1 hidden sm:block">Machine learning untuk pemula</p>
              </button>
              <button
                onClick={() => setInput("Buatkan ringkasan tentang sejarah Indonesia")}
                className="p-3 sm:p-4 rounded-xl border border-border hover:bg-accent text-left transition-colors active:scale-[0.98]"
              >
                <p className="font-medium text-foreground text-xs sm:text-sm">📝 Ringkasan materi</p>
                <p className="text-muted-foreground text-xs mt-1 hidden sm:block">Sejarah Indonesia</p>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 sm:p-4 rounded-xl border border-border hover:bg-accent text-left transition-colors active:scale-[0.98]"
              >
                <p className="font-medium text-foreground text-xs sm:text-sm">📄 Upload PDF</p>
                <p className="text-muted-foreground text-xs mt-1 hidden sm:block">Ringkas dokumen pelajaran</p>
              </button>
              <button
                onClick={() => setInput("Buat soal latihan tentang fisika dasar")}
                className="p-3 sm:p-4 rounded-xl border border-border hover:bg-accent text-left transition-colors active:scale-[0.98]"
              >
                <p className="font-medium text-foreground text-xs sm:text-sm">✏️ Soal latihan</p>
                <p className="text-muted-foreground text-xs mt-1 hidden sm:block">Fisika dasar</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-16 lg:pt-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-4 mb-4 sm:mb-6 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 relative group ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.type === "pdf" && message.fileName && (
                    <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                      <FileText className="w-4 h-4" />
                      <span>{message.fileName}</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
                  </div>
                  
                  {/* Copy Button - hanya untuk assistant */}
                  {message.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 
                                 flex items-center gap-1 text-xs text-muted-foreground 
                                 hover:text-foreground transition-all"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="text-xs sm:text-sm">Sedang berpikir...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-2 sm:p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto"
        >
          {/* Staged PDF Preview */}
          {stagedPdf && (
            <div className="mb-2 sm:mb-3 flex items-center gap-2 bg-muted rounded-xl px-3 sm:px-4 py-2 sm:py-3">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              <span className="flex-1 text-xs sm:text-sm text-foreground truncate">
                {stagedPdf.name}
              </span>
              <button
                type="button"
                onClick={removeStagedPdf}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Hapus PDF"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="relative flex items-end gap-1 sm:gap-2 bg-muted rounded-2xl px-2 sm:px-4 py-2 sm:py-3">
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
              className={`p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-colors ${
                stagedPdf ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Upload PDF"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={stagedPdf ? "Tulis instruksi untuk PDF ini..." : "Tanyakan sesuatu..."}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-xs sm:text-sm py-2"
              style={{ maxHeight: "200px" }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !stagedPdf) || isLoading}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                (input.trim() || stagedPdf) && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>

          <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 px-2">
            {stagedPdf 
              ? "📄 PDF siap. Tulis instruksi lalu kirim."
              : "AI dapat membuat kesalahan. Periksa info penting."
            }
          </p>
        </form>
      </div>
    </div>
  );
}
