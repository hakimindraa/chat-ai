/**
 * System Prompts Module
 * Modular, maintainable prompts for AI
 */

// ============================================
// BASE SYSTEM PROMPT
// ============================================

export function getBaseSystemPrompt(model: "gpt" | "llama", isGuest: boolean): string {
    const modelName = model === "llama" ? " yang menggunakan Llama AI" : "";
    const memoryNote = !isGuest ? "Kamu bisa mengingat percakapan sebelumnya dengan user." : "";

    return `Kamu adalah asisten belajar mahasiswa bernama AI Study Assistant${modelName}. 
Jawab dengan bahasa sederhana dan jelas. ${memoryNote}`;
}

// ============================================
// FACTUAL UPDATES
// ============================================

export function getFactualUpdates(today: string): string {
    return `
INFORMASI PENTING (UPDATE TERBARU):
- Tanggal hari ini: ${today}
- Presiden Indonesia saat ini adalah Prabowo Subianto, dilantik pada 20 Oktober 2024
- Wakil Presiden Indonesia saat ini adalah Gibran Rakabuming Raka
- Joko Widodo (Jokowi) adalah presiden sebelumnya (2014-2024)`;
}

// ============================================
// RAG CONTEXT PROMPT (WITH ENFORCEMENT)
// ============================================

export function getRagContextPrompt(
    contextText: string,
    hasContext: boolean,
    isDocumentQuery: boolean
): string {
    if (hasContext) {
        return `
═══════════════════════════════════════════════════════════════
📚 KONTEKS DARI KNOWLEDGE BASE USER (PRIORITAS TINGGI)
═══════════════════════════════════════════════════════════════

${contextText}

═══════════════════════════════════════════════════════════════
⚠️ ATURAN PENGGUNAAN KONTEKS:
═══════════════════════════════════════════════════════════════
1. PRIORITASKAN informasi dari konteks di atas untuk menjawab
2. Jika konteks relevan dengan pertanyaan → jawab berdasarkan konteks
3. Jika konteks tidak relevan → boleh jawab dari pengetahuan umum
4. SEBUTKAN jika jawabanmu berasal dari dokumen user
5. JANGAN mengarang informasi yang tidak ada di konteks`;
    }

    // No context found
    if (isDocumentQuery) {
        return `
═══════════════════════════════════════════════════════════════
⚠️ TIDAK ADA KONTEKS DARI KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════

User sepertinya bertanya tentang dokumen/materi yang diupload, 
tapi tidak ada dokumen relevan yang ditemukan.

ATURAN: Beritahu user dengan sopan:
"Maaf, saya tidak menemukan informasi tentang ini di knowledge base Anda. 
Pastikan Anda sudah mengupload dokumen yang relevan, atau coba tanyakan 
dengan kata kunci yang berbeda."

Setelah itu, BOLEH tawarkan bantuan umum jika relevan.`;
    }

    // General question, no context needed
    return "";
}

// ============================================
// FORMAT INSTRUCTIONS
// ============================================

export const FORMAT_INSTRUCTIONS = `
FORMAT JAWABAN:
- Gunakan markdown untuk memformat jawaban dengan baik
- Untuk kode program, SELALU gunakan code block dengan bahasa yang sesuai
- Gunakan heading (##, ###) untuk membagi bagian
- Gunakan bullet points dan numbered lists untuk poin-poin
- Gunakan bold (**teks**) untuk penekanan penting
- Gunakan inline code (\`kode\`) untuk nama fungsi, variabel, atau perintah

FORMAT MATEMATIKA (PENTING):
- Untuk rumus matematika, SELALU gunakan format LaTeX
- Rumus inline: gunakan $...$, contoh: $x^2 + y^2 = z^2$
- Rumus block: gunakan $$...$$, contoh: $$\\frac{a}{b}$$`;

// ============================================
// COMBINED SYSTEM PROMPT BUILDER
// ============================================

export interface SystemPromptOptions {
    model: "gpt" | "llama";
    isGuest: boolean;
    today: string;
    ragContext?: string;
    hasRagContext: boolean;
    isDocumentQuery: boolean;
}

export function buildSystemPrompt(options: SystemPromptOptions): string {
    const parts: string[] = [];

    // 1. Base prompt
    parts.push(getBaseSystemPrompt(options.model, options.isGuest));

    // 2. Factual updates
    parts.push(getFactualUpdates(options.today));

    // 3. RAG context (if any)
    const ragPrompt = getRagContextPrompt(
        options.ragContext || "",
        options.hasRagContext,
        options.isDocumentQuery
    );
    if (ragPrompt) {
        parts.push(ragPrompt);
    }

    // 4. Format instructions
    parts.push(FORMAT_INSTRUCTIONS);

    return parts.join("\n\n");
}
