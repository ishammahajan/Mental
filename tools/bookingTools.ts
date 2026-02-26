import { FunctionDeclaration, Type } from "@google/genai";

export const getAvailableSlotsTool: FunctionDeclaration = {
  name: "getAvailableSlots",
  description: "Get a list of available appointment slots with the counselor.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const bookSlotTool: FunctionDeclaration = {
  name: "bookSlot",
  description: "Book a specific appointment slot using its ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slotId: {
        type: Type.STRING,
        description: "The ID of the slot to book.",
      },
    },
    required: ["slotId"],
  },
};
