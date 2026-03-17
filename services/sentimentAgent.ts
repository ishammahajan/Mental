import { Message, AgentAnalysis, WellnessTask } from "../types";
import * as db from './storage';
import { handleBookingRequest } from './bookingAgent';
import { analyzeMentalHealthText } from './mentalHealthSentimentService';
import { withTimeoutRetry } from './retryService';
import { validateMessage } from './validationService';

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const IS_PRODUCTION = currentHostname !== 'localhost';
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

    // Use retry logic for resilience - will retry up to 3 times with exponential backoff
    const data = await withTimeoutRetry(
      async () => {
        const res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages })
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error');
          throw new Error(`HF Agent failed with status ${res.status}: ${errorText}`);
        }

        return res.json();
      },
      12000  // 12 second timeout (slightly longer than single attempt)
    );
    const rawContent = data?.choices?.[0]?.message?.content || '{}';
    
    // Robust JSON extraction function
    function extractJSON(text: string): string {
      // Try markdown code block first (e.g., ```json {...}```)
      const mdMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (mdMatch) {
        try {
          JSON.parse(mdMatch[1]);
          return mdMatch[1];
        } catch {
          // Fall through to other methods
        }
      }
      
      // Try to find balanced JSON object
      let braceCount = 0;
      let start = -1;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (braceCount === 0) start = i;
          braceCount++;
        } else if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0 && start !== -1) {
            const candidate = text.substring(start, i + 1);
            try {
              JSON.parse(candidate);
              return candidate;
            } catch {
              // Continue searching
              start = -1;
            }
          }
        }
      }
      
      // If nothing found, return safe default
      return '{}';
    }

    const jsonText = extractJSON(rawContent);
    let analysis: Partial<AgentAnalysis> & { recommendedAction: string; specificExercise?: string; reasoning?: string };
    
    try {
      analysis = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("[SParsh Guardian] Failed to parse agent JSON response:", parseErr);
      console.error("[SParsh Guardian] Raw response was:", rawContent.substring(0, 200));
      // Return null to trigger catch block for graceful degradation
      throw new Error("Failed to parse sentiment analysis response");
    }
    
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
    // Log error for debugging
    if (e.name !== 'AbortError') {
      console.error("[SParsh Guardian] Agent analysis failed:", e.message);
    }

    // Graceful degradation: if HF risk was HIGH or CRITICAL, suggest booking anyway
    if (hfResult?.riskLevel === 'HIGH' || hfResult?.riskLevel === 'MODERATE') {
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
    
    // Silent fail for non-critical emotions
    return null;
  }
};