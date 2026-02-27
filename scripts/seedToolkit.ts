import { Pinecone } from '@pinecone-database/pinecone';
import { HfInference } from '@huggingface/inference';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Setup environment variables so script can run locally via ts-node / node
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PINECONE_API_KEY = process.env.VITE_PINECONE_API_KEY || '';
const HF_TOKEN = process.env.VITE_HF_TOKEN || '';

if (!PINECONE_API_KEY || !HF_TOKEN) {
    console.error("❌ Missing VITE_PINECONE_API_KEY or VITE_HF_TOKEN in .env.local");
    process.exit(1);
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const hf = new HfInference(HF_TOKEN);
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

const TOOLKIT_ITEMS = [
    { id: 'tk-1', text: "Box Breathing Technique: Breathe in for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 4 times to regulate your nervous system during panic attacks.", tags: ['anxiety', 'panic', 'grounding'] },
    { id: 'tk-2', text: "5-4-3-2-1 Grounding Method: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. Useful for dissociation and severe anxiety.", tags: ['anxiety', 'panic', 'dissociation'] },
    { id: 'tk-3', text: "The 'Noticing' Coping Mechanism: Say out loud 'I am noticing that I am feeling anxious'. This externalizes the emotion so it does not overwhelm your identity.", tags: ['stress', 'mindfulness'] },
    { id: 'tk-4', text: "Progressive Muscle Relaxation: Tense your toes for 5 seconds, then release. Move up to your calves, thighs, and all the way to your face. Great for physical tension and insomnia.", tags: ['insomnia', 'stress', 'body'] },
    { id: 'tk-5', text: "Defusion Technique - The Passengers on the Bus: Treat your anxious thoughts like annoying passengers on a bus you are driving. You acknowledge they are there, but you keep driving toward your goal.", tags: ['cbt', 'anxiety', 'focus'] },
    { id: 'tk-6', text: "Imposter Syndrome Reframing: Write down three factual achievements or instances of positive feedback you received recently. Facts counter the emotional belief of being a fraud.", tags: ['imposter syndrome', 'confidence', 'academics'] },
    { id: 'tk-7', text: "Worry Postponement: When a stressful thought arises, tell yourself 'I will worry about this at 7:00 PM for 15 minutes'. If the thought returns, remind yourself of the scheduled time.", tags: ['rumination', 'anxiety'] },
    { id: 'tk-8', text: "Behavioral Activation for Burnout: Choose one tiny, extremely easy task (like organizing a single drawer or answering one email) to break the cycle of paralysis. Momentum builds from small wins.", tags: ['burnout', 'depression', 'academics'] },
    { id: 'tk-9', text: "Self-Compassion Pause: Put your hand over your heart and say 'This is a moment of suffering. Suffering is a part of life. May I be kind to myself in this moment.'", tags: ['self-esteem', 'burnout', 'mindfulness'] },
    { id: 'tk-10', text: "The 'Best Friend' Test: If your best friend came to you with this exact problem or failure, what would you say to them? Now say that to yourself.", tags: ['self-criticism', 'imposter syndrome', 'sadness'] },
];

async function generateEmbedding(text: string): Promise<number[]> {
    const output = await hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
    });
    // @ts-ignore
    return (Array.isArray(output[0]) ? output[0] : output) as number[];
}

async function run() {
    console.log('🌱 Starting Toolkit Ingestion to Pinecone...');
    const index = pinecone.Index('speakup-toolkit');

    for (const item of TOOLKIT_ITEMS) {
        try {
            console.log(`Embedding: ${item.id}...`);
            const vector = await generateEmbedding(item.text);

            console.log(`Generated vector for ${item.id} with length: ${vector ? vector.length : 'undefined'}`);

            if (!vector || vector.length === 0) {
                throw new Error(`Vector generation failed or returned empty for ${item.id}`);
            }

            await index.upsert({
                records: [{
                    id: item.id,
                    values: vector,
                    metadata: {
                        text: item.text,
                        tags: item.tags,
                    }
                }]
            });
            console.log(`✅ Upserted ${item.id} (${item.tags.join(', ')})`);
        } catch (e: any) {
            console.error(`❌ Failed to embed ${item.id}. Error: ${e.message || String(e)}`);
        }
    }

    console.log('🎉 Done! All toolkit items pushed to Pinecone.');
}

run();
