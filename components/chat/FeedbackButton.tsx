"use client";

import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FeedbackButtonProps {
    question: string;
    answer: string;
    onFeedback?: (isPositive: boolean) => void;
}

export default function FeedbackButton({ question, answer, onFeedback }: FeedbackButtonProps) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);

    const handleFeedback = async (isPositive: boolean) => {
        if (submitted) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include", // Include cookies for NextAuth session
                body: JSON.stringify({
                    question,
                    answer,
                    isPositive,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(isPositive ? "positive" : "negative");
                if (isPositive) {
                    toast.success("Jawaban disimpan ke knowledge base! 🧠");
                } else {
                    toast.info("Terima kasih atas feedback Anda");
                }
                onFeedback?.(isPositive);
            } else {
                if (response.status === 401) {
                    toast.error("Login untuk menyimpan ke knowledge base");
                } else {
                    toast.error(data.error || "Gagal menyimpan feedback");
                }
            }
        } catch (error) {
            toast.error("Gagal menyimpan feedback");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => handleFeedback(true)}
                disabled={submitted !== null}
                className={`p-1.5 rounded-lg transition-all duration-200 ${submitted === "positive"
                    ? "bg-green-500/20 text-green-500"
                    : submitted !== null
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                    }`}
                title="Jawaban bagus - simpan ke knowledge base"
            >
                <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={() => handleFeedback(false)}
                disabled={submitted !== null}
                className={`p-1.5 rounded-lg transition-all duration-200 ${submitted === "negative"
                    ? "bg-red-500/20 text-red-500"
                    : submitted !== null
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    }`}
                title="Jawaban kurang bagus"
            >
                <ThumbsDown className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
