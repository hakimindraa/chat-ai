"use client";

import { Bot, Sparkles, Zap } from "lucide-react";

interface ModelSwitchProps {
    value: "auto" | "gpt" | "llama";
    onChange: (value: "auto" | "gpt" | "llama") => void;
    disabled?: boolean;
}

export default function ModelSwitch({ value, onChange, disabled }: ModelSwitchProps) {
    const models = [
        {
            id: "auto" as const,
            label: "Auto",
            shortLabel: "Auto",
            icon: Sparkles,
            color: "from-purple-500 to-pink-500",
        },
        {
            id: "gpt" as const,
            label: "GPT-4",
            shortLabel: "GPT",
            icon: Bot,
            color: "from-green-500 to-emerald-500",
        },
        {
            id: "llama" as const,
            label: "Llama",
            shortLabel: "Llama",
            icon: Zap,
            color: "from-orange-500 to-amber-500",
        },
    ];

    return (
        <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-xl">
            {models.map((model) => (
                <button
                    key={model.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(model.id)}
                    className={`
                        flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                        transition-all duration-200
                        ${value === model.id
                            ? `bg-gradient-to-r ${model.color} text-white shadow-lg`
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    title={`Pilih ${model.label}`}
                >
                    <model.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-xs font-medium">{model.label}</span>
                </button>
            ))}
        </div>
    );
}
