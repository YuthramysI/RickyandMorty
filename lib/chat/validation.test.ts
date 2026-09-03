import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "./validation";
import { CHAT_MAX_MESSAGES, CHAT_MAX_MESSAGE_LENGTH } from "@/lib/constants";

describe("chatRequestSchema", () => {
  it("accepts a valid minimal request", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional characterContext", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "hello" }],
      characterContext: { id: 1, name: "Rick Sanchez" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty messages array", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a message with an invalid role", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "system", content: "hi" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects message content longer than the configured max length", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "a".repeat(CHAT_MAX_MESSAGE_LENGTH + 1) }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more messages than the configured max history", () => {
    const messages = Array.from({ length: CHAT_MAX_MESSAGES + 1 }, (_, i) => ({
      role: "user" as const,
      content: `message ${i}`,
    }));
    const result = chatRequestSchema.safeParse({ messages });
    expect(result.success).toBe(false);
  });

  it("rejects a characterContext with a non-positive id", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
      characterContext: { id: -1, name: "Nobody" },
    });
    expect(result.success).toBe(false);
  });
});
