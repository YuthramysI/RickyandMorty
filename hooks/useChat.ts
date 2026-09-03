"use client";

import { useCallback, useRef, useState } from "react";
import { CHAT_MAX_MESSAGES } from "@/lib/constants";
import type { CharacterContext, ChatMessage, ChatStreamEvent } from "@/types/chat";

function createId(): string {
  return Math.random().toString(36).slice(2);
}

interface UseChatOptions {
  activeCharacter: CharacterContext | null;
}

export function useChat({ activeCharacter }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  const appendToAssistant = useCallback((chunk: string) => {
    const id = assistantIdRef.current;
    if (!id) return;
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content: message.content + chunk } : message,
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmed };
      const assistantMessage: ChatMessage = { id: createId(), role: "assistant", content: "" };
      assistantIdRef.current = assistantMessage.id;

      const history = [...messages, userMessage];
      setMessages([...history, assistantMessage]);
      setIsStreaming(true);
      setPendingToolCall(null);

      try {
        // The UI keeps the full conversation, but only the most recent
        // messages are sent - the server enforces the same cap and would
        // otherwise reject a long-running chat outright once it's exceeded.
        const recentHistory = history.slice(-CHAT_MAX_MESSAGES);

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: recentHistory.map(({ role, content: text }) => ({ role, content: text })),
            characterContext: activeCharacter ?? undefined,
          }),
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ChatStreamEvent;
            if (event.type === "tool_call") {
              setPendingToolCall(event.name);
            } else if (event.type === "token") {
              setPendingToolCall(null);
              appendToAssistant(event.value);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsStreaming(false);
        setPendingToolCall(null);
        assistantIdRef.current = null;
      }
    },
    [messages, isStreaming, activeCharacter, appendToAssistant],
  );

  return { messages, sendMessage, isStreaming, pendingToolCall, error };
}
