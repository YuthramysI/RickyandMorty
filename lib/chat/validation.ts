import { z } from "zod";
import { CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_MESSAGES } from "@/lib/constants";

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(CHAT_MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1)
    .max(CHAT_MAX_MESSAGES),
  characterContext: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
    })
    .optional(),
});
