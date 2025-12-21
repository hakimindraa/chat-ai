"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Zap, Lock, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ModelSwitchProps {
    value: "auto" | "gpt" | "llama";
    onChange: (value: "auto" | "gpt" | "llama") => void;
    disabled?: boolean;
    isGuest?: boolean;
}

export default function ModelSwitch({ value, onChange, disabled, isGuest = false }: ModelSwitchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const models = [
        {
            id: "auto" as const,
            label: "Auto",
            description: "Otomatis pilih model terbaik",
            icon: Sparkles,
            color: "from-purple-500 to-pink-500",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-500",
            locked: false
        },
        {
            id: "gpt" as const,
            label: "GPT-4",
            description: "Model OpenAI paling pintar",
            icon: Bot,
            color: "from-green-500 to-emerald-500",
            bgColor: "bg-green-500/10",
            textColor: "text-green-500",
            locked: isGuest
        },
        {
            id: "llama" as const,
            label: "Llama",
            description: "Model Meta yang cepat & gratis",
            icon: Zap,
            color: "from-orange-500 to-amber-500",
            bgColor: "bg-orange-500/10",
            textColor: "text-orange-500",
            locked: isGuest
        },
    ];

    const selectedModel = models.find(m => m.id === value) || models[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (modelId: "auto" | "gpt" | "llama", locked: boolean) => {
        if (locked) {
            toast.error("🔒 Fitur Premium", {
                description: "Login untuk membuka akses manual ke model ini.",
                action: {
                    label: "Login",
                    onClick: () => window.location.href = "/login"
                }
            });
            return;
        }
        onChange(modelId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-muted/50 hover:bg-muted transition-all duration-200
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
            >
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${selectedModel.color} flex items-center justify-center`}>
                    <selectedModel.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{selectedModel.label}</span>
                <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu (Opens Upward) */}
            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in z-50">
                    <div className="p-1.5 space-y-1">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                type="button"
                                onClick={() => handleSelect(model.id, model.locked)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                    transition-all duration-200 text-left
                                    ${value === model.id
                                        ? `bg-gradient-to-r ${model.color} text-white`
                                        : "hover:bg-muted text-foreground"
                                    }
                                    ${model.locked ? "opacity-60" : ""}
                                `}
                            >
                                {/* Icon */}
                                <div className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                    ${value === model.id
                                        ? "bg-white/20"
                                        : model.bgColor
                                    }
                                `}>
                                    {model.locked ? (
                                        <Lock className={`w-4 h-4 ${value === model.id ? "text-white" : model.textColor}`} />
                                    ) : (
                                        <model.icon className={`w-4 h-4 ${value === model.id ? "text-white" : model.textColor}`} />
                                    )}
                                </div>

                                {/* Label & Description */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{model.label}</span>
                                        {model.locked && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                                                Premium
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${value === model.id ? "text-white/70" : "text-muted-foreground"}`}>
                                        {model.description}
                                    </p>
                                </div>

                                {/* Checkmark for selected */}
                                {value === model.id && (
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
