/**
 * Query Expansion Module
 * Expands user queries for better RAG retrieval
 * Uses Groq (FREE) for query expansion
 */

import { groq } from "@/lib/groq";
import { logAI } from "./config";

const QUERY_EXPANSION_PROMPT = `Kamu adalah query expander untuk sistem pencarian dokumen akademik/belajar.

TUGAS:
Perluas query user dengan menambahkan kata kunci relevan untuk meningkatkan hasil pencarian.

ATURAN:
1. Output HANYA query yang diperluas, TANPA penjelasan
2. Pertahankan intent asli dari user
3. Tambahkan sinonim dan kata kunci terkait
4. Jangan mengubah makna query
5. Maksimal 50 kata

CONTOH:
Input: "siapa sophie?"
Output: "siapa sophie karakter utama novel dunia filsafat jostein gaarder norwegia"

Input: "rumus pythagoras"
Output: "rumus teorema pythagoras matematika segitiga siku-siku a² + b² = c² geometri"

Input: "apa itu demokrasi"
Output: "apa itu demokrasi sistem pemerintahan rakyat pemilu voting politik kebebasan"`;

/**
 * Expand query for better RAG retrieval
 * Uses Groq Llama (FREE and fast)
 */
export async function expandQuery(query: string): Promise<{
    original: string;
    expanded: string;
    wasExpanded: boolean;
}> {
    // Skip expansion for very short or very long queries
    if (query.length < 5 || query.length > 200) {
        return { original: query, expanded: query, wasExpanded: false };
    }

    try {
        const startTime = Date.now();

        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant", // Super fast and FREE
            messages: [
                { role: "system", content: QUERY_EXPANSION_PROMPT },
                { role: "user", content: query }
            ],
            max_tokens: 100,
            temperature: 0.3, // Low for consistency
        });

        const expanded = response.choices[0]?.message?.content?.trim() || query;

        logAI({
            level: "info",
            event: "QUERY_EXPANDED",
            metadata: {
                original: query,
                expanded: expanded,
                latencyMs: Date.now() - startTime,
            }
        });

        return {
            original: query,
            expanded: expanded,
            wasExpanded: expanded !== query,
        };
    } catch (error) {
        logAI({
            level: "error",
            event: "QUERY_EXPANSION_ERROR",
            error: String(error),
        });

        // Fallback: return original query
        return { original: query, expanded: query, wasExpanded: false };
    }
}

/**
 * Simple keyword extraction (fallback if Groq fails)
 */
export function extractKeywords(text: string): string[] {
    const stopwords = new Set([
        "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan",
        "adalah", "ini", "itu", "atau", "juga", "dalam", "oleh",
        "apa", "siapa", "kapan", "dimana", "mengapa", "bagaimana",
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "of", "in", "to", "for", "on", "with", "at", "by", "from",
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.has(word));
}
