import { Bot, Sparkles, Zap, Lock } from "lucide-react";
import { toast } from "sonner";

interface ModelSwitchProps {
    value: "auto" | "gpt" | "llama";
    onChange: (value: "auto" | "gpt" | "llama") => void;
    disabled?: boolean;
    isGuest?: boolean;
}

export default function ModelSwitch({ value, onChange, disabled, isGuest = false }: ModelSwitchProps) {
    const models = [
        {
            id: "auto" as const,
            label: "Auto",
            shortLabel: "Auto",
            icon: Sparkles,
            color: "from-purple-500 to-pink-500",
            locked: false
        },
        {
            id: "gpt" as const,
            label: "GPT-4",
            shortLabel: "GPT",
            icon: Bot,
            color: "from-green-500 to-emerald-500",
            locked: isGuest // Guest cannot select GPT explicitly (force auto) or just visual? User said "locked".
        },
        {
            id: "llama" as const,
            label: "Llama",
            shortLabel: "Llama",
            icon: Zap,
            color: "from-orange-500 to-amber-500",
            locked: isGuest
        },
    ];

    const handleClick = (modelId: "auto" | "gpt" | "llama", locked: boolean) => {
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
    };

    return (
        <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-xl">
            {models.map((model) => (
                <button
                    key={model.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleClick(model.id, model.locked)}
                    className={`
                        flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                        transition-all duration-200 relative group
                        ${value === model.id
                            ? `bg-gradient-to-r ${model.color} text-white shadow-lg`
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }
                        ${model.locked ? "opacity-60 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}
                        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    title={model.locked ? "Login untuk membuka" : `Pilih ${model.label}`}
                >
                    {model.locked ? (
                        <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                        <model.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline text-xs font-medium">{model.label}</span>

                    {/* Locked Badge (optional small dot) */}
                    {model.locked && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-background" />
                    )}
                </button>
            ))}
        </div>
    );
}
