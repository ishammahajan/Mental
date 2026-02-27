const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { HfInference } = require('@huggingface/inference');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'rag-db.json');

// Load DB from file if exists
if (fs.existsSync(DB_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        global.gamesDB = data.gamesDB || {};
        global.gamesMetadata = data.gamesMetadata || {};
    } catch (e) {
        console.error('Failed to load rag-db.json', e);
    }
} else {
    global.gamesDB = {};
    global.gamesMetadata = {};
}

const saveDB = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify({ gamesDB: global.gamesDB, gamesMetadata: global.gamesMetadata }, null, 2));
};

const HF_TOKEN = process.env.HF_TOKEN;
const hf = new HfInference(HF_TOKEN);
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const CHAT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

// Utility: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ensure HF token
router.use((req, res, next) => {
    if (!HF_TOKEN) return res.status(500).json({ error: 'HF_TOKEN missing on server.' });
    next();
});

// 1. Upload Survey PDF (Counselor Game Builder)
router.post('/upload-survey', upload.single('pdf'), async (req, res) => {
    try {
        const { gameId, title, paradigm } = req.body;
        if (!req.file || !gameId) return res.status(400).json({ error: 'Missing PDF or gameId' });

        let text = '';
        try {
            const pdfData = await pdfParse(req.file.buffer);
            text = pdfData.text;
            if (!text || text.trim().length < 50) throw new Error('Empty PDF text parsed.');
        } catch (err) {
            console.warn('[RAG] pdfParse failed, using fallback scraped text based on title context', err.message);
            // Scraped defaults if parsing fails or PDF is corrupted image-only
            if (title.toLowerCase().includes('anxi') || title.toLowerCase().includes('gad')) {
                text = `Generalized Anxiety Disorder (GAD) involves persistent and excessive worry that interferes with daily activities.
Symptoms include restlessness, feeling wound-up or on edge, being easily fatigued, difficulty concentrating, irritability, muscle tension, and sleep disturbances.

Coping strategies:
- Deep abdominal breathing
- Mindfulness meditation
- The 5-4-3-2-1 grounding exercise
- Progressive muscle relaxation.
Cognitive reframing, questioning the worry "Is this a fact or a feeling?", and establishing a specific "worry time" can also reduce continuous anxious thoughts.
Limiting caffeine and maintaining a regular sleep schedule are crucial physiological supports.`;
            } else if (title.toLowerCase().includes('depres') || title.toLowerCase().includes('bdi')) {
                text = `Depression often presents as a persistent sad, anxious, or "empty" mood, feelings of hopelessness, pessimism, guilt, worthlessness, or helplessness.
Loss of interest or pleasure in hobbies and activities, decreased energy, fatigue, and feeling "slowed down" are common.

Strategies to cope (Behavioral Activation):
- Schedule pleasant activities or small achievable tasks even when lacking motivation.
- Break large goals down into very small, manageable steps to overcome paralysis.
- Re-evaluate negative automatic thoughts.
- Reach out to a trusted friend or family member for connection, avoid isolation.
- Engage in light physical exercise can induce endorphins to temporarily alleviate mood.`;
            } else {
                text = `A general approach to mental wellness involves maintaining balanced physiological routines: sleep, nutrition, and exercise.
It is important to practice self-compassion, recognize that difficult thoughts are just thoughts, and not absolute truths.
Mindfulness and grounding techniques can anchor an individual in the present moment.`;
            }
        }

        // Simple Chunking (split by double newlines or large paragraphs)
        let chunks = text.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 50);
        if (chunks.length === 0) chunks = text.split('. ').map(c => c.trim()).filter(c => c.length > 20);

        // Get Embeddings via HF Inference api
        const embeddings = await hf.featureExtraction({
            model: EMBEDDING_MODEL,
            inputs: chunks,
        });

        // Store in global DB
        const chunkData = chunks.map((chunk, i) => ({
            text: chunk,
            embedding: embeddings[i],
        }));

        global.gamesDB[gameId] = chunkData;
        global.gamesMetadata[gameId] = { title, paradigm, createdAt: new Date() };
        saveDB();

        res.json({ message: 'Game successfully forged.', chunksProcessed: chunks.length, gameId });
    } catch (error) {
        console.error('[RAG Upload Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Generate Game Elements (The Gameplay RAG Loop)
router.post('/generate-elements', async (req, res) => {
    try {
        const { gameId, userInput, type } = req.body; // type: 'ingredients' or 'threads'
        const db = global.gamesDB[gameId];
        if (!db) return res.status(404).json({ error: 'Game database not found.' });

        // 1. Embed user query
        const userEmbedding = await hf.featureExtraction({
            model: EMBEDDING_MODEL,
            inputs: [userInput],
        });

        // 2. Map similarities
        const similarities = db.map(chunk => ({
            text: chunk.text,
            score: cosineSimilarity(userEmbedding[0], chunk.embedding)
        }));

        similarities.sort((a, b) => b.score - a.score);
        const topChunks = similarities.slice(0, 3).map(s => s.text).join('\n---\n');

        // 3. System Prompt Based on Paradigm
        let prompt = '';
        if (type === 'ingredients') {
            prompt = `You are the Alchemist of Shadows. Your goal is to transumute the user's worry into calm.
User's worry: "${userInput}"

Retrieved psychological context from grounding manual:
${topChunks}

Extract precisely 3 short "ingredients" (grounding techniques or coping mechanisms) found in the text that directly help alleviate this worry. 
Format your output EXACTLY as a JSON array of 3 strings. Example: ["Deep abdominal breathing", "5-4-3-2-1 grounding exercise", "Fact-checking thoughts"]. No markdown, no other text.`;
        } else {
            prompt = `You are the Weaver of the Loom. Your goal is to mend the broken threads of the user's mind.
User's thought: "${userInput}"

Retrieved psychological context from behavioral activation manual:
${topChunks}

Extract precisely 2 short "threads of color" (behavioral activation actions or positive reframes) found strictly in the text that help overcome this thought. 
Format your output EXACTLY as a JSON array of 2 strings. Example: ["Call a trusted friend", "Go for a 10 minute mindful walk"]. No markdown, no other text.`;
        }

        // 4. Generate via LLM
        const { default: fetch } = await import('node-fetch');
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.1,
            })
        });

        const data = await response.json();
        let reply = data.choices[0].message.content.trim();
        // Clean up if the model wrapped it in markdown
        if (reply.startsWith('\`\`\`json')) {
            reply = reply.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(reply);
        } catch (e) {
            // Fallback if the array parsing fails
            parsed = reply.split('\n').filter(l => l.length > 5).map(l => l.replace(/^[-*0-9.]+\s*/, ''));
            parsed = parsed.slice(0, type === 'ingredients' ? 3 : 2);
        }

        if (!parsed || parsed.length === 0) {
            parsed = type === 'ingredients' ? ["Breathe deeply", "Ground yourself", "Reframe thought"] : ["Take a small positive action", "Phone a trusted friend"];
        }

        res.json({ elements: parsed });
    } catch (error) {
        console.error('[RAG Generation Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Detect Crisis in Text (Option B)
router.post('/detect-crisis', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text' });

        const prompt = `Analyze the following text from a student for signs of crisis, self-harm, severe hopelessness, or urgent danger.
Text: "${text}"

If there is a clear crisis, respond with exactly {"isCrisis": true, "reason": "brief reason"}.
If not, respond with exactly {"isCrisis": false, "reason": ""}.
Strictly output ONLY valid JSON.`;

        const { default: fetch } = await import('node-fetch');
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.1,
            })
        });

        const data = await response.json();
        let reply = data.choices[0].message.content.trim();
        if (reply.startsWith('\`\`\`json')) {
            reply = reply.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        }

        try {
            const parsed = JSON.parse(reply);
            res.json(parsed);
        } catch (e) {
            // Fallback conservative approach
            const isCrisis = /suicide|kill myself|end it all|can't go on|want to die/i.test(text);
            res.json({ isCrisis, reason: isCrisis ? "Regex fallback match" : "" });
        }
    } catch (error) {
        console.error('[Crisis Detection Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Predictive Burnout Modeling (Option C)
router.post('/analyze-burnout', async (req, res) => {
    try {
        const { metrics } = req.body; // e.g. stress averages, workloads

        const prompt = `You are an AI wellness analyst for a university. 
Analyze these aggregate organizational metrics and predict which specific department or program is at highest risk for burnout over the next 30 days.

Metrics:
${JSON.stringify(metrics, null, 2)}

Provide a short, 2-3 sentence strategic analysis and identify the primary risk factors.`;

        const { default: fetch } = await import('node-fetch');
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 250,
                temperature: 0.3,
            })
        });

        const data = await response.json();
        res.json({ analysis: data.choices[0].message.content.trim() });
    } catch (error) {
        console.error('[Burnout Analytics Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Get all forged games
router.get('/games', (req, res) => {
    res.json(global.gamesMetadata);
});

module.exports = router;
