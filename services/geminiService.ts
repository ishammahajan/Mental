/**
 * SPARSH AI — 3-TIER FREE MODEL CHAIN
 *
 * Tier 1: Ollama (LOCAL — completely private, zero cost, no internet needed)
 *   - Requires Ollama running at http://localhost:11434
 *   - Models: llama3.2, mistral, phi3 (auto-detects what's available)
 *
 * Tier 2: HuggingFace Inference API (free with token)
 *   - Model: mistralai/Mistral-7B-Instruct-v0.3
 *   - Requires VITE_HF_TOKEN in .env
 *
 * Tier 3: Google Gemini (free via AI Studio)
 *   - Models: gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-flash-8b
 */

import { SPARSH_SYSTEM_INSTRUCTION } from "../constants";
import { VibeType, WeatherData } from "../types";
import { analyzeMentalHealthText } from "./mentalHealthSentimentService";


// ─── Config ──────────────────────────────────────────────────────────────────
const HF_TOKEN = (import.meta as any).env?.VITE_HF_TOKEN || '';
const OLLAMA_URL = (import.meta as any).env?.VITE_OLLAMA_URL || 'http://localhost:11434';

const HF_CHAT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';
const OLLAMA_MODELS = ['llama3.2', 'mistral', 'phi3']; // Try in order

type SParshResponse = {
  text: string;
  isCrisis: boolean;
  detectedMood?: VibeType;
  modelUsed: 'ollama' | 'huggingface' | 'offline_fallback';
  modelName?: string;
};

// ─── Tier 1: Ollama (local) ───────────────────────────────────────────────────
const tryOllama = async (
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[],
  userMsg: string
): Promise<string | null> => {
  // First, check which models are available
  for (const model of OLLAMA_MODELS) {
    try {
      const prompt = `${systemPrompt}\n\n${history.map(h => `${h.role === 'model' ? 'Assistant' : 'User'}: ${h.parts[0].text}`).join('\n')}\nUser: ${userMsg}\nAssistant:`;
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(8000), // 8s timeout for local
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.response) return data.response;
    } catch {
      // Timeout or connection refused — Ollama not running
      return null;
    }
  }
  return null;
};

// ─── Tier 2: HuggingFace Inference API ───────────────────────────────────────
const tryHuggingFace = async (
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[],
  userMsg: string
): Promise<string | null> => {
  if (!HF_TOKEN) return null;
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
      { role: 'user', content: userMsg },
    ];
    const res = await fetch(`https://api-inference.huggingface.co/models/${HF_CHAT_MODEL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: HF_CHAT_MODEL, messages, max_tokens: 512, temperature: 0.7 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
};

// ─── Main export ─────────────────────────────────────────────────────────────
export const sendMessageToSParsh = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  _useThinking = true
): Promise<SParshResponse> => {
  // Crisis kill-switch (client-side, zero latency)
  const crisisRx = [/suicide/i, /kill myself/i, /end it all/i, /want to die/i, /self-harm/i, /better off dead/i];
  if (crisisRx.some(r => r.test(newMessage))) {
    return { text: "I am activating the safety protocol. Please hold on.", isCrisis: true, modelUsed: 'offline_fallback' };
  }

  let rawText: string | null = null;
  let modelUsed: SParshResponse['modelUsed'] = 'offline_fallback';
  let modelName = '';

  // Try Tier 1: Ollama
  rawText = await tryOllama(SPARSH_SYSTEM_INSTRUCTION, history, newMessage);
  if (rawText) { modelUsed = 'ollama'; modelName = 'Ollama (local)'; }

  // Try Tier 2: HuggingFace
  if (!rawText) {
    rawText = await tryHuggingFace(SPARSH_SYSTEM_INSTRUCTION, history, newMessage);
    if (rawText) { modelUsed = 'huggingface'; modelName = HF_CHAT_MODEL; }
  }

  // Final Tier 4: Offline Rule-Based Sentiment Fallback
  if (!rawText) {
    const sentiment = await analyzeMentalHealthText(newMessage);
    modelUsed = 'offline_fallback';
    modelName = 'SParsh Offline Rule-based';

    if (sentiment.riskLevel === 'CRITICAL') {
      rawText = "[CRITICAL_PROTOCOL_TRIGGER] It sounds like you are going through a very difficult time. Please know you are not alone. Please reach out to iCall at 9152987821. Help is on the way.";
    } else if (sentiment.dominantEmotion === 'sadness') {
      rawText = "I sense you're feeling sad. Even though my cloud connections are offline right now, I'm here for you. Taking deep breaths can help ground you in this moment. 💙";
    } else if (sentiment.dominantEmotion === 'fear') {
      rawText = "It sounds like you're feeling anxious. Take a deep breath. Try the 5-4-3-2-1 grounding technique: name 5 things you can see, 4 you can touch... I'm listening. 🌿";
    } else if (sentiment.dominantEmotion === 'anger') {
      rawText = "I hear your frustration. It's completely valid to feel this way. Physical movement like a short walk might help release some of this tension. 🚶‍♂️";
    } else if (sentiment.dominantEmotion === 'joy') {
      rawText = "I'm so glad to hear some positivity in your words! Keep holding onto that feeling! 🌟";
    } else {
      rawText = "I'm having a bit of trouble connecting to my cloud mind right now. Taking a short break and returning to what you're doing later might help. ☕";
    }
  }

  const text = rawText || "I'm having a bit of trouble connecting right now. Take a breath — I'm still here 💚";
  const isCrisis = text.includes('[CRISIS_PROTOCOL_TRIGGER]') || text.includes('[CRITICAL_PROTOCOL_TRIGGER]');

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
    modelName,
  };
};

// ─── Weather AI Suggestion ────────────────────────────────────────────────────
export const getAIWeatherSuggestion = async (weather: WeatherData): Promise<string> => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = now.toLocaleDateString([], { weekday: 'long' });
  const prompt = `It is ${day} at ${time} in ${weather.city}. Weather: ${weather.condition} at ${weather.temp}°C, AQI ${weather.aqi}/5. Give a 1-2 line mood-lifting suggestion for a student. Be warm and quirky like a caring friend.`;

  // Try HF
  if (HF_TOKEN) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${HF_CHAT_MODEL}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: HF_CHAT_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 80 }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const d = await res.json();
        const s = d?.choices?.[0]?.message?.content;
        if (s) return s;
      }
    } catch { /* fall through */ }
  }

  return "Take a deep breath and find a moment of calm 🌿";
};