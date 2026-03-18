import { GoogleGenAI } from "@google/genai";
import { getAvailableSlotsTool, bookSlotTool } from "../tools/bookingTools";
import * as db from "./storage";
import { isDemoMode } from './demoMode';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

let ai: GoogleGenAI | undefined;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error("VITE_GEMINI_API_KEY is not set in bookingAgent. AI services will be unavailable.");
}


export const handleBookingRequest = async (userId: string, userName: string, query: string) => {
  if (isDemoMode() || !ai) {
    const openSlots = (await db.getSlots()).filter(s => s.status === 'open');
    if (openSlots.length === 0) {
      return 'I could not find any open slots right now. Please check the Slot Booking tab later.';
    }

    if (/book|schedule|slot|appointment/i.test(query)) {
      const best = openSlots[0];
      return `I found an open slot on ${best.date} at ${best.time} with ${best.counselorName}. You can book it from the Slot Booking tab.`;
    }
    return 'If you want to book a session, just tell me and I will suggest the next available slot.';
  }
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: {
      tools: [{ functionDeclarations: [getAvailableSlotsTool, bookSlotTool] }],
    },
  });

  const call = response.functionCalls?.[0];

  if (call) {
    if (call.name === "getAvailableSlots") {
      const allSlots = await db.getSlots();
      const openSlots = allSlots.filter(s => s.status === 'open');
      const secondResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: 'user', parts: [{ text: query }] },
          {
            role: 'model', parts: [{
              functionResponse: {
                name: "getAvailableSlots",
                response: {
                  slots: openSlots,
                },
              },
            }]
          },
        ],
      });
      return secondResponse.text;
    } else if (call.name === "bookSlot") {
      const { slotId } = call.args as { slotId: string };
      const success = await db.requestSlot(slotId, userId, userName);
      const secondResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: 'user', parts: [{ text: query }] },
          {
            role: 'model', parts: [{
              functionResponse: {
                name: "bookSlot",
                response: {
                  success,
                },
              },
            }]
          },
        ],
      });
      return secondResponse.text;
    }
  }

  return response.text;
};


