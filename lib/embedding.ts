// Simple embedding and similarity search utilities
// Uses a basic approach without external dependencies

/**
 * Simple text preprocessing for embedding
 */
export function preprocessText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Simple bag-of-words based embedding (lightweight alternative)
 * For production, use OpenAI embeddings or sentence-transformers
 */
export function simpleEmbed(text: string): number[] {
    const processed = preprocessText(text);
    const words = processed.split(' ');

    // Create a simple hash-based embedding
    const embedding: number[] = new Array(128).fill(0);

    for (const word of words) {
        const hash = simpleHash(word);
        const index = Math.abs(hash) % 128;
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

/**
 * Simple string hash function
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
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
 * Search for similar documents
 */
export function findSimilar(
    query: string,
    documents: { id: number; content: string; embedding?: string }[],
    topK: number = 3
): { id: number; content: string; score: number }[] {
    const queryEmbedding = simpleEmbed(query);

    const scored = documents.map(doc => {
        let docEmbedding: number[];

        if (doc.embedding) {
            try {
                docEmbedding = JSON.parse(doc.embedding);
            } catch {
                docEmbedding = simpleEmbed(doc.content);
            }
        } else {
            docEmbedding = simpleEmbed(doc.content);
        }

        return {
            id: doc.id,
            content: doc.content,
            score: cosineSimilarity(queryEmbedding, docEmbedding)
        };
    });

    // Sort by similarity score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top K results with score > threshold
    return scored.filter(item => item.score > 0.1).slice(0, topK);
}

/**
 * Chunk text into smaller pieces for better retrieval
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim()) {
            chunks.push(chunk);
        }
    }

    return chunks;
}
