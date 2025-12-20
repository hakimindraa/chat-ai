import Groq from "groq-sdk";

// Initialize Groq client
export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Available models on Groq (Updated December 2024)
export const GROQ_MODELS = {
    LLAMA_3_3_70B: "llama-3.3-70b-versatile",
    LLAMA_3_1_8B: "llama-3.1-8b-instant",
    MIXTRAL: "mixtral-8x7b-32768",
} as const;

// Default model
export const DEFAULT_GROQ_MODEL = GROQ_MODELS.LLAMA_3_3_70B;

