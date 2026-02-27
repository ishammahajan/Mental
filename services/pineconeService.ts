
import { HfInference } from '@huggingface/inference';

const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY || '';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';

// Initialize clients conditionally so it doesn't crash if keys are missing
export const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generates a 384-dimensional vector embedding for the given text using HuggingFace.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!hf) throw new Error('HuggingFace token missing. Cannot generate embeddings.');
    try {
        const output = await hf.featureExtraction({
            model: EMBEDDING_MODEL,
            inputs: text,
        });
        // The HF Inference API returns a nested array for feature extraction, we just need the 1D vector
        // @ts-ignore
        return (Array.isArray(output[0]) ? output[0] : output) as number[];
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Queries Pinecone for the top K matching documents based on the input text.
 * Uses direct REST fetch to ensure browser/Vite compatibility without Node polyfills.
 */
export async function queryToolkit(queryText: string, topK: number = 3) {
    if (!PINECONE_API_KEY) throw new Error('Pinecone API key missing.');

    try {
        const queryVector = await generateEmbedding(queryText);

        // 1. Get the Index Host dynamically
        const describeRes = await fetch('https://api.pinecone.io/indexes/speakup-toolkit', {
            headers: { 'Api-Key': PINECONE_API_KEY }
        });
        if (!describeRes.ok) throw new Error('Failed to fetch Pinecone index host');
        const describeData = await describeRes.json();
        const host = describeData.host;

        // 2. Query the vectors
        const queryRes = await fetch(`https://${host}/query`, {
            method: 'POST',
            headers: {
                'Api-Key': PINECONE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vector: queryVector,
                topK,
                includeMetadata: true
            })
        });

        if (!queryRes.ok) throw new Error('Failed to query Pinecone vectors');
        const queryData = await queryRes.json();

        return queryData.matches.map((match: any) => match.metadata);
    } catch (e) {
        console.error('Pinecone REST Query Error:', e);
        return [];
    }
}
