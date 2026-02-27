/**
 * SPARSH AI — Frontend Chat Service
 *
 * Tier 1: HuggingFace Qwen2.5-7B-Instruct (direct from browser, free)
 * Tier 2: Node.js Proxy fallback (localhost:3001)
 * Tier 3: Offline rule-based sentiment response (always available)
 */

import { SPARSH_SYSTEM_INSTRUCTION } from "../constants";
import { VibeType, WeatherData } from "../types";
import { analyzeMentalHealthText } from "./mentalHealthSentimentService";

// ─── Config ───────────────────────────────────────────────────────────────────
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';
const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';

const IS_PRODUCTION = window.location.hostname !== 'localhost';
const PROXY_URL = IS_PRODUCTION
  ? 'https://speakup-backend.up.railway.app/api/chat'
  : 'http://localhost:3001/api/chat';

// ─── Types ────────────────────────────────────────────────────────────────────
type SParshResponse = {
  text: string;
  isCrisis: boolean;
  detectedMood?: VibeType;
  modelUsed: 'huggingface_direct' | 'proxy' | 'offline';
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ─── Build OpenAI-compatible message array ────────────────────────────────────
const buildMessages = (
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[],
  userMsg: string
): ChatMessage[] => [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: (h.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: h.parts[0]?.text ?? '',
    })),
    { role: 'user', content: userMsg },
  ];

// ─── Tier 1: HuggingFace direct from browser ─────────────────────────────────
const tryHuggingFaceDirect = async (messages: ChatMessage[]): Promise<string | null> => {
  if (!HF_TOKEN) return null;
  try {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: HF_MODEL, messages, max_tokens: 512, temperature: 0.7 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
};

// ─── Tier 2: Node.js proxy fallback ──────────────────────────────────────────
const tryProxy = async (messages: ChatMessage[]): Promise<string | null> => {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
};

// ─── Tier 3: Offline sentiment-based responses ────────────────────────────────
const getOfflineResponse = async (userMsg: string): Promise<string> => {
  try {
    const sentiment = await analyzeMentalHealthText(userMsg);
    if (sentiment.riskLevel === 'CRITICAL') {
      return '[CRITICAL_PROTOCOL_TRIGGER] It sounds like you are going through an incredibly difficult time. You are not alone — please reach out to iCall right now at 9152987821.';
    }
    const emotion = sentiment.dominantEmotion;
    if (emotion === 'sadness') return "I sense you're carrying something heavy. Even offline, I'm here. Take a slow breath — you don't have to carry this alone. 💙";
    if (emotion === 'fear') return "Sounds like anxiety is present. Try 5-4-3-2-1: name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. I'm here. 🌿";
    if (emotion === 'anger') return "Your frustration is valid. A short walk or stretching can help release tension. I'm listening when you're ready. 🚶";
    if (emotion === 'joy') return "I love the positive energy! Hold onto that feeling — it's real and it's yours. 🌟";
  } catch { /* ignore */ }
  return "I'm here with you. Tell me how you're feeling and I'll do my best to help. ✨";
};

// ─── Crisis Detection ─────────────────────────────────────────────────────────
/**
 * Tier-1 client-side crisis patterns: fired against user INPUT before any API call.
 * Extended to cover paraphrased expressions of suicidal ideation and self-harm.
 */
const INPUT_CRISIS_PATTERNS = [
  /\bsuicid/i,
  /kill\s+myself/i,
  /end\s+it\s+all/i,
  /want\s+to\s+die/i,
  /self[\s-]?harm/i,
  /better\s+off\s+dead/i,
  /cut\s+myself/i,
  /hurt\s+myself/i,
  /no\s+reason\s+to\s+live/i,
  /ending\s+my\s+life/i,
  /end\s+my\s+life/i,
  /take\s+my\s+(own\s+)?life/i,
  /don['']?t\s+want\s+to\s+(be\s+here|exist|live)/i,
  /not\s+want\s+to\s+(be\s+here|exist|live)/i,
  /never\s+wake\s+up/i,
  /wish\s+i\s+(was|were)\s+dead/i,
  /disappear\s+forever/i,
  /everyone\s+would\s+be\s+better\s+without\s+me/i,
  /no\s+point\s+(in\s+)?(living|going\s+on|anymore)/i,
  /can['']?t\s+(go\s+on|do\s+this\s+anymore|take\s+it\s+anymore)/i,
  /ending\s+everything/i,
  /life\s+is\s+not\s+worth/i,
  /overdose/i,
  /hang\s+myself/i,
  /jump\s+(off|from)/i,
];

/**
 * Tier-2 secondary patterns: scanned against the AI MODEL'S OWN RESPONSE TEXT.
 * If the model itself outputs crisis-indicating language, we still trigger the overlay.
 */
const OUTPUT_CRISIS_PATTERNS = [
  /\[CRITICAL_PROTOCOL_TRIGGER\]/i,
  /\[CRISIS_PROTOCOL_TRIGGER\]/i,
  /iCall\s+9152987821/i,
];

const isCrisisInput = (text: string): boolean =>
  INPUT_CRISIS_PATTERNS.some(r => r.test(text));

const isCrisisOutput = (text: string): boolean =>
  OUTPUT_CRISIS_PATTERNS.some(r => r.test(text));

// ─── Main Export ──────────────────────────────────────────────────────────────
export const sendMessageToSParsh = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
): Promise<SParshResponse> => {

  // Tier-1 crisis kill-switch — zero latency, fires before any API call
  if (isCrisisInput(newMessage)) {
    return {
      text: "I'm here with you. Please reach out to iCall at 9152987821 right now — you matter deeply. [CRITICAL_PROTOCOL_TRIGGER]",
      isCrisis: true,
      modelUsed: 'offline',
    };
  }

  const messages = buildMessages(SPARSH_SYSTEM_INSTRUCTION, history, newMessage);
  let rawText: string | null = null;
  let modelUsed: SParshResponse['modelUsed'] = 'offline';

  // Tier 1: Direct HuggingFace call
  rawText = await tryHuggingFaceDirect(messages);
  if (rawText) modelUsed = 'huggingface_direct';

  // Tier 2: Node proxy
  if (!rawText) {
    rawText = await tryProxy(messages);
    if (rawText) modelUsed = 'proxy';
  }

  // Tier 3: Offline fallback
  if (!rawText) {
    rawText = await getOfflineResponse(newMessage);
    modelUsed = 'offline';
  }

  const text = rawText || "I'm here for you. How are you feeling? 💚";
  // Secondary crisis check: also scan the AI's own response text for crisis indicators
  const isCrisis = isCrisisOutput(text) || isCrisisInput(text);

  // Detect mood tags injected by the model
  let detectedMood: VibeType | undefined;
  const moodMatch = text.match(/\[\[MOOD:\s*(\w+)\]\]/i);
  if (moodMatch?.[1]) {
    const raw = moodMatch[1].toLowerCase();
    if (['calm', 'anxious', 'focus', 'tired', 'energetic'].includes(raw)) detectedMood = raw as VibeType;
  }

  return {
    text: text.replace(/\[\[MOOD:\s*\w+\]\]/gi, '').replace('[CRISIS_PROTOCOL_TRIGGER]', '').replace('[CRITICAL_PROTOCOL_TRIGGER]', '').trim(),
    isCrisis,
    detectedMood,
    modelUsed,
  };
};

// ─── Weather AI Suggestion ────────────────────────────────────────────────────
export const getAIWeatherSuggestion = async (weather: WeatherData): Promise<string> => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = now.toLocaleDateString([], { weekday: 'long' });
  const prompt = `It is ${day} at ${time} in ${weather.city}. Weather: ${weather.condition} at ${weather.temp}°C, AQI ${weather.aqi}/5. Give a warm, 1-2 sentence mood-lifting suggestion for a college student.`;
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

  const direct = await tryHuggingFaceDirect(messages);
  if (direct) return direct;

  try {
    const res = await fetch(PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal: AbortSignal.timeout(10000) });
    if (res.ok) { const d = await res.json(); const s = d?.choices?.[0]?.message?.content?.trim(); if (s) return s; }
  } catch { /* fall through */ }

  return "Take a deep breath and find a moment of calm today 🌿";
};