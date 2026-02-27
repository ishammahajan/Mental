import { Message, AgentAnalysis, WellnessTask } from "../types";
import * as db from './storage';
import { handleBookingRequest } from './bookingAgent';
import { analyzeMentalHealthText } from './mentalHealthSentimentService';

const IS_PRODUCTION = window.location.hostname !== 'localhost';
const PROXY_URL = IS_PRODUCTION
  ? 'https://speakup-backend.up.railway.app/api/chat'
  : 'http://localhost:3001/api/chat';

export const analyzeSentimentAndSchedule = async (
  userId: string,
  userEmail: string,
  recentMessages: Message[],
  modelIndex: number = 0
): Promise<Message | null> => {

  const lastUserMessages = recentMessages.filter(m => m.role === 'user').slice(-3);
  const fullContext = lastUserMessages.map(m => m.text).join(' ');

  if (!fullContext) return null;

  // ─── Stage 1: HuggingFace specialized mental health sentiment ───────────
  // Uses j-hartmann/emotion-english-distilroberta-base (free, no key needed)
  const hfResult = await analyzeMentalHealthText(fullContext);
  console.log(`[SParsh Guardian] HF Sentiment (${hfResult.source}):`, hfResult.dominantEmotion, hfResult.riskLevel);

  // Direct crisis intercept from specialist model — no need to call LLM
  if (hfResult.riskLevel === 'CRITICAL') {
    return {
      id: Date.now().toString(), role: 'agent',
      text: "CRITICAL ALERT: I am activating the campus emergency protocol. Help is on the way.",
      timestamp: new Date(), metadata: { type: 'crisis_trigger' }
    };
  }

  const conversationLog = recentMessages.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  // ─── Stage 2: HuggingFace Mistral for nuanced text reasoning & action selection ──────
  // ─── Stage 2: HuggingFace Mistral for nuanced text reasoning & action selection ──────

  try {
    const systemPrompt = `
      Act as "SParsh Guardian", an Autonomous Wellness Triage System.
      
      SPECIALIST MENTAL HEALTH ANALYSIS (from emotion model):
      - Dominant Emotion: ${hfResult.dominantEmotion}
      - Wellbeing Score: ${hfResult.sentimentScore}/100
      - Risk Level: ${hfResult.riskLevel}

      RULES — choose one action based on the analysis above AND conversation:
      1. High fear/sadness or MODERATE+ risk, mentions insomnia/panic/restlessness → ASSIGN_EXERCISE
      2. Sustained distress, mentions "need to talk"/"overwhelmed" → SUGGEST_BOOKING
      3. User explicitly asks to book/schedule → BOOK_SLOT
      4. Otherwise → NONE

      Return strictly a JSON object with this shape:
      {
        "recommendedAction": "NONE" | "SUGGEST_BOOKING" | "ASSIGN_EXERCISE" | "BOOK_SLOT",
        "specificExercise": "Breathing Exercise" | "Grounding" | "Journaling" | null,
        "reasoning": "string explanation"
      }
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Context: ${conversationLog}` }
    ];

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error("HF Agent failed");

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || '{}';
    // attempt to extract json if it wrapped it in markdown
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : rawContent;

    const analysis: Partial<AgentAnalysis> & { recommendedAction: string; specificExercise?: string; reasoning?: string } =
      JSON.parse(jsonText);
    console.log("Guardian Action:", analysis.recommendedAction);

    if (analysis.recommendedAction === 'ASSIGN_EXERCISE' && analysis.specificExercise) {
      const newTask: WellnessTask = {
        id: Date.now().toString(),
        title: analysis.specificExercise,
        description: `Auto-assigned by SParsh Guardian (${hfResult.dominantEmotion} detected): ${analysis.reasoning || ''}`,
        isCompleted: false,
        assignedBy: "SParsh AI"
      };
      await db.assignTask(userEmail, newTask);
      return {
        id: Date.now().toString(), role: 'agent',
        text: `I noticed you might be feeling ${hfResult.dominantEmotion} right now 💙. I've added a "${analysis.specificExercise}" routine to your Tasks tab — it can really help.`,
        timestamp: new Date(), metadata: { type: 'task_assignment', taskName: analysis.specificExercise }
      };
    }

    if (analysis.recommendedAction === 'BOOK_SLOT') {
      const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        const bookingResponse = await handleBookingRequest(userId, userEmail, lastUserMessage.text);
        return { id: Date.now().toString(), role: 'agent', text: bookingResponse, timestamp: new Date(), metadata: { type: 'booking_confirmation' } };
      }
    }

    if (analysis.recommendedAction === 'SUGGEST_BOOKING') {
      const openSlots = (await db.getSlots()).filter(s => s.status === 'open');
      if (openSlots.length > 0) {
        const best = openSlots[0];
        return {
          id: Date.now().toString(), role: 'agent',
          text: `It sounds like you're carrying a lot right now. Sometimes talking to someone helps. I've found an open slot with the counselor — you can book directly below 💙`,
          timestamp: new Date(),
          metadata: { type: 'booking_suggestion', slotId: best.id, slotTime: `${best.date} at ${best.time}` }
        };
      }
    }

    return null;

  } catch (e: any) {
    console.error("SLM Agent Error:", e);

    // Even if Gemini fails, we can still act on critical HF result
    if (hfResult.riskLevel === 'HIGH') {
      const openSlots = (await db.getSlots()).filter(s => s.status === 'open');
      if (openSlots.length > 0) {
        return {
          id: Date.now().toString(), role: 'agent',
          text: "I can sense you might be going through a tough moment. Would you like to book a session with the counselor? You can do so directly below 💙",
          timestamp: new Date(),
          metadata: { type: 'booking_suggestion', slotId: openSlots[0].id, slotTime: `${openSlots[0].date} at ${openSlots[0].time}` }
        };
      }
    }
    return null;
  }
};