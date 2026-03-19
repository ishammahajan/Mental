const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Allow both local dev and the Railway-hosted frontend
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://mental-production.up.railway.app',
        /\.railway\.app$/,
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// RAG Game Builder endpoints
const ragRouter = require('./ragRouter');
app.use('/api/rag', ragRouter);

// HuggingFace Configuration
const HF_TOKEN = process.env.HF_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Maker Lab <no-reply@tasks-no-reply.isham.in>';

// Working model: Qwen2.5-7B-Instruct (confirmed free with HF account)
const HF_CHAT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: HF_CHAT_MODEL, message: 'SPeakUp AI Proxy running' });
});

// ─── Proxy route for SParsh Chatbot ──────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        if (!HF_TOKEN) {
            return res.status(500).json({ error: 'HF_TOKEN is not configured on server' });
        }

        const { default: fetch } = await import('node-fetch');

        const response = await fetch(HF_ROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: HF_CHAT_MODEL,
                messages: messages,
                max_tokens: 512,
                temperature: 0.7,
                stream: false
            }),
            signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[HF Error]', { status: response.status, body: errorText });
            return res.status(response.status).json({ error: 'Upstream AI error', detail: errorText });
        }

        const data = await response.json();
        return res.json(data);

    } catch (error) {
        console.error('[Server Error]', error.message);
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return res.status(504).json({ error: 'AI request timed out' });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;

        if (!to || !subject) {
            return res.status(400).json({ error: 'to and subject are required' });
        }

        const recipients = Array.isArray(to)
            ? to.map((email) => String(email).trim()).filter(Boolean)
            : [String(to).trim()].filter(Boolean);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'At least one valid recipient is required' });
        }

        const contentText = String(text || '').trim();
        const contentHtml = String(html || '').trim();
        if (!contentText && !contentHtml) {
            return res.status(400).json({ error: 'Either text or html body is required' });
        }

        if (!RESEND_API_KEY) {
            return res.status(500).json({ error: 'RESEND_API_KEY is not configured on server' });
        }

        const { default: fetch } = await import('node-fetch');

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: EMAIL_FROM,
                to: recipients,
                subject: String(subject),
                ...(contentHtml ? { html: contentHtml } : {}),
                ...(contentText ? { text: contentText } : {}),
            }),
            signal: AbortSignal.timeout(15000),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Email provider request failed',
                detail: data,
            });
        }

        return res.json({ success: true, provider: 'resend', data });
    } catch (error) {
        console.error('[Email Error]', error.message);
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return res.status(504).json({ error: 'Email request timed out' });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`[SPeakUp Backend] Running on port ${PORT}`);
    console.log(`[SPeakUp Backend] Using model: ${HF_CHAT_MODEL}`);
    if (!HF_TOKEN) {
        console.warn('⚠️  WARNING: HF_TOKEN is not set! AI calls will fail.');
    } else {
        console.log(`[SPeakUp Backend] HF_TOKEN is set ✅`);
    }
    if (!RESEND_API_KEY) {
        console.warn('⚠️  WARNING: RESEND_API_KEY is not set! Email sends will fail.');
    } else {
        console.log('[SPeakUp Backend] RESEND_API_KEY is set ✅');
    }
});
