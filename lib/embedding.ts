// Pro RAG Embedding using HuggingFace (FREE)
// Uses all-MiniLM-L6-v2 model for semantic embeddings

const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

/**
 * Get embeddings from HuggingFace API (FREE)
 * Model: all-MiniLM-L6-v2 - 384 dimensions
 */
export async function getEmbedding(text: string): Promise<number[]> {
    // Preprocess text
    const cleanText = text
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 512); // Model has max token limit

    try {
        const response = await fetch(HUGGINGFACE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // HuggingFace API is free without token for public models
                // Add token here if rate limited: "Authorization": `Bearer ${process.env.HUGGINGFACE_TOKEN}`
            },
            body: JSON.stringify({
                inputs: cleanText,
                options: { wait_for_model: true }
            }),
        });

        if (!response.ok) {
            console.error("HuggingFace API error:", response.status);
            // Fallback to simple embedding if API fails
            return fallbackEmbed(cleanText);
        }

        const embedding = await response.json();

        // Handle nested array response
        if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
            return embedding[0];
        }

        return embedding;
    } catch (error) {
        console.error("Embedding error:", error);
        // Fallback to simple embedding
        return fallbackEmbed(cleanText);
    }
}

/**
 * Batch embedding for multiple texts (more efficient)
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
    const cleanTexts = texts.map(text =>
        text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 512)
    );

    try {
        const response = await fetch(HUGGINGFACE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: cleanTexts,
                options: { wait_for_model: true }
            }),
        });

        if (!response.ok) {
            console.error("HuggingFace API error:", response.status);
            return cleanTexts.map(t => fallbackEmbed(t));
        }

        const embeddings = await response.json();
        return embeddings;
    } catch (error) {
        console.error("Batch embedding error:", error);
        return cleanTexts.map(t => fallbackEmbed(t));
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find similar documents using semantic search
 */
export async function findSimilarDocuments(
    query: string,
    documents: { id: number; content: string; embedding?: string }[],
    topK: number = 3
): Promise<{ id: number; content: string; score: number }[]> {
    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    const scored = documents.map(doc => {
        let docEmbedding: number[];

        if (doc.embedding) {
            try {
                docEmbedding = JSON.parse(doc.embedding);
            } catch {
                // If parsing fails, skip this document
                return { id: doc.id, content: doc.content, score: 0 };
            }
        } else {
            // No embedding stored, skip
            return { id: doc.id, content: doc.content, score: 0 };
        }

        return {
            id: doc.id,
            content: doc.content,
            score: cosineSimilarity(queryEmbedding, docEmbedding)
        };
    });

    // Sort by similarity score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top K results with score > threshold (0.3 for semantic search)
    return scored.filter(item => item.score > 0.3).slice(0, topK);
}

/**
 * Chunk text into smaller pieces for better retrieval
 */
export function chunkText(text: string, chunkSize: number = 300, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim() && chunk.split(/\s+/).length > 10) { // Minimum 10 words
            chunks.push(chunk);
        }
    }

    return chunks;
}

/**
 * Fallback simple embedding if HuggingFace fails
 */
function fallbackEmbed(text: string): number[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
    const embedding: number[] = new Array(384).fill(0); // Match HuggingFace dimensions

    for (const word of words) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const index = Math.abs(hash) % 384;
        embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] /= magnitude;
        }
    }

    return embedding;
}

// Re-export for backward compatibility
export const simpleEmbed = fallbackEmbed;
