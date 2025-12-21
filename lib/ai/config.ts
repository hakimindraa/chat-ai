/**
 * AI Configuration Module
 * Centralized config for AI model behavior
 */

// ============================================
// MODEL CONFIGURATIONS
// ============================================

export const AI_MODELS = {
    GPT: {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
    },
    LLAMA: {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        provider: "groq",
    },
} as const;

// ============================================
// TEMPERATURE CONFIGS PER USE CASE
// ============================================

export const TEMPERATURE_CONFIG = {
    // For RAG/factual answers - low creativity, high accuracy
    RAG: 0.1,

    // For general conversation
    GENERAL: 0.5,

    // For coding assistance
    CODE: 0.2,

    // For creative tasks
    CREATIVE: 0.8,
} as const;

// ============================================
// TOKEN LIMITS
// ============================================

export const TOKEN_CONFIG = {
    MAX_OUTPUT: 2048,
    MAX_CONTEXT: 4096,
    HISTORY_LIMIT: 10, // Max chat history to include
} as const;

// ============================================
// RAG CONFIGURATION
// ============================================

export const RAG_CONFIG = {
    // Minimum similarity score to consider relevant (0-1)
    MIN_SIMILARITY_SCORE: 0.3,

    // Number of documents to retrieve
    TOP_K: 3,

    // Whether to enforce context usage
    ENFORCE_CONTEXT: true,

    // Refuse to answer if context is empty and question is about documents
    REFUSE_ON_EMPTY: true,
} as const;

// ============================================
// LOGGING CONFIGURATION
// ============================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AILogEntry {
    timestamp: string;
    level: LogLevel;
    event: string;
    userId?: number;
    model?: string;
    isFallback?: boolean;
    ragUsed?: boolean;
    contextFound?: boolean;
    latencyMs?: number;
    error?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Structured logging for AI operations
 */
export function logAI(entry: Omit<AILogEntry, "timestamp">) {
    const logEntry: AILogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
    };

    const prefix = `[AI:${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.event}`;

    switch (entry.level) {
        case "debug":
            console.debug(message, logEntry);
            break;
        case "info":
            console.log(message, logEntry);
            break;
        case "warn":
            console.warn(message, logEntry);
            break;
        case "error":
            console.error(message, logEntry);
            break;
    }

    // TODO: Send to external monitoring service (e.g., Sentry, LogRocket)
    // sendToMonitoring(logEntry);

    return logEntry;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get temperature based on context
 */
export function getTemperature(hasRagContext: boolean, isCodeQuestion: boolean): number {
    if (isCodeQuestion) return TEMPERATURE_CONFIG.CODE;
    if (hasRagContext) return TEMPERATURE_CONFIG.RAG;
    return TEMPERATURE_CONFIG.GENERAL;
}

/**
 * Check if query is likely about user's documents
 */
export function isDocumentQuery(query: string): boolean {
    const documentKeywords = [
        "dokumen", "file", "pdf", "upload", "buku", "materi",
        "catatan", "yang saya", "yang aku", "yang di", "isinya",
        "bab", "halaman", "bagian", "chapter", "slide"
    ];

    const lowerQuery = query.toLowerCase();
    return documentKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Check if query is likely about code
 */
export function isCodeQuery(query: string): boolean {
    const codeKeywords = [
        "code", "kode", "coding", "program", "function", "fungsi",
        "class", "method", "variable", "error", "bug", "debug",
        "javascript", "python", "php", "java", "react", "next"
    ];

    const lowerQuery = query.toLowerCase();
    return codeKeywords.some(keyword => lowerQuery.includes(keyword));
}
