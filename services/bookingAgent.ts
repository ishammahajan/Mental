import { GoogleGenAI } from "@google/genai";
import { getAvailableSlotsTool, bookSlotTool } from "../tools/bookingTools";
import * as db from "./storage";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

let ai: GoogleGenAI | undefined;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error("GEMINI_API_KEY is not set in bookingAgent. AI services will be unavailable.");
}


export const handleBookingRequest = async (userId: string, userName: string, query: string) => {
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
          { role: 'model', parts: [{ functionResponse: {
              name: "getAvailableSlots",
              response: {
                slots: openSlots,
              },
            },
          }]},
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
          { role: 'model', parts: [{ functionResponse: {
              name: "bookSlot",
              response: {
                success,
              },
            },
          }]},
        ],
      });
      return secondResponse.text;
    }
  }

  return response.text;
};
