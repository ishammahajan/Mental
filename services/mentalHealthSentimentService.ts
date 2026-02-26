/**
 * MENTAL HEALTH SPECIALIST SENTIMENT SERVICE
 *
 * Model: j-hartmann/emotion-english-distilroberta-base (HuggingFace)
 * - Trained specifically on emotion & mental health text
 * - 7 emotion classes: anger, disgust, fear, joy, neutral, sadness, surprise
 * - FREE: public model on HuggingFace Inference API
 * - Optional: set VITE_HF_TOKEN in .env for higher rate limits (still free)
 * - No data used for training — inference only
 *
 * Fallback: rule-based keyword scoring (offline, zero-latency)
 */

const HF_MODEL = 'j-hartmann/emotion-english-distilroberta-base';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const HF_TOKEN = (import.meta as any).env?.VITE_HF_TOKEN || '';

export type EmotionLabel = 'anger' | 'disgust' | 'fear' | 'joy' | 'neutral' | 'sadness' | 'surprise';

export interface EmotionScore {
    label: EmotionLabel;
    score: number;
}

export interface MentalHealthSentimentResult {
    emotions: EmotionScore[];         // Top emotions ranked by score
    dominantEmotion: EmotionLabel;
    sentimentScore: number;           // 0 (worst) – 100 (best)
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    source: 'huggingface' | 'fallback';
}

/** Maps HuggingFace emotion scores → our 0-100 wellbeing score */
const emotionsToScore = (emotions: EmotionScore[]): number => {
    const map: Record<EmotionLabel, number> = {
        joy: 90, neutral: 65, surprise: 60,
        anger: 20, disgust: 15, fear: 10, sadness: 10,
    };
    // Weighted average of all emotions
    const totalScore = emotions.reduce((sum, e) => sum + (map[e.label] || 50) * e.score, 0);
    const totalWeight = emotions.reduce((sum, e) => sum + e.score, 0);
    return Math.round(totalScore / (totalWeight || 1));
};

/** Maps wellbeing score → clinical risk tier */
const scoreToRisk = (score: number, dominant: EmotionLabel): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' => {
    if (dominant === 'sadness' && score < 20) return 'CRITICAL';
    if (dominant === 'fear' && score < 20) return 'HIGH';
    if (score >= 70) return 'LOW';
    if (score >= 45) return 'MODERATE';
    if (score >= 20) return 'HIGH';
    return 'CRITICAL';
};

/** Offline rule-based fallback when HF API is unavailable */
const ruleBasedFallback = (text: string): MentalHealthSentimentResult => {
    const lower = text.toLowerCase();
    const negKeywords = ['sad', 'hopeless', 'alone', 'tired', 'anxious', 'panic', 'scared', 'afraid', 'cry', 'hurt', 'hate', 'angry', 'worthless', 'depressed', 'overwhelm', 'stress'];
    const posKeywords = ['happy', 'good', 'great', 'calm', 'fine', 'okay', 'excited', 'hope', 'better', 'grateful', 'thank', 'love'];
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'self-harm'];

    if (crisisKeywords.some(w => lower.includes(w))) {
        return { emotions: [{ label: 'sadness', score: 1 }], dominantEmotion: 'sadness', sentimentScore: 0, riskLevel: 'CRITICAL', source: 'fallback' };
    }

    const negCount = negKeywords.filter(w => lower.includes(w)).length;
    const posCount = posKeywords.filter(w => lower.includes(w)).length;
    const score = Math.max(0, Math.min(100, 50 + posCount * 10 - negCount * 12));
    const dominant: EmotionLabel = negCount > posCount ? (negCount > 2 ? 'sadness' : 'fear') : (posCount > 1 ? 'joy' : 'neutral');

    return {
        emotions: [{ label: dominant, score: 1 }],
        dominantEmotion: dominant,
        sentimentScore: score,
        riskLevel: scoreToRisk(score, dominant),
        source: 'fallback',
    };
};

/**
 * Primary analysis function.
 * Calls HuggingFace free inference API with mental-health specialized model.
 * Falls back to rule-based offline analysis on any error.
 */
export const analyzeMentalHealthText = async (text: string): Promise<MentalHealthSentimentResult> => {
    if (!text.trim()) return ruleBasedFallback(text);

    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`;

        const res = await fetch(HF_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ inputs: text.slice(0, 512) }), // Model max tokens
        });

        if (!res.ok) {
            // 503 = model loading (cold start). Use fallback gracefully.
            if (res.status === 503) console.info('HF model loading, using offline fallback...');
            else console.warn(`HF API error ${res.status}, using fallback.`);
            return ruleBasedFallback(text);
        }

        const raw: { label: string; score: number }[][] = await res.json();
        const emotions = (raw[0] || []).map(e => ({
            label: e.label.toLowerCase() as EmotionLabel,
            score: e.score,
        })).sort((a, b) => b.score - a.score);

        if (!emotions.length) return ruleBasedFallback(text);

        const dominantEmotion = emotions[0].label;
        const sentimentScore = emotionsToScore(emotions);
        const riskLevel = scoreToRisk(sentimentScore, dominantEmotion);

        return { emotions, dominantEmotion, sentimentScore, riskLevel, source: 'huggingface' };

    } catch (err) {
        console.warn('HF sentiment API unreachable, using offline fallback:', err);
        return ruleBasedFallback(text);
    }
};
