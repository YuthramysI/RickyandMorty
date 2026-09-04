"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { ToolCallIndicator } from "./ToolCallIndicator";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  pendingToolCall: string | null;
}

export function ChatMessageList({ messages, pendingToolCall }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingToolCall]);

  if (messages.length === 0) {
    return (
      <div className="text-foreground/50 flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm">
        <span className="text-accent font-mono text-xs tracking-widest uppercase">
          [ signal open ]
        </span>
        Ask me anything about Rick and Morty characters or episodes - I&apos;ll look up real data to
        answer.
      </div>
    );
  }

  return (
    <div
      className="notranslate flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      translate="no"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {pendingToolCall && <ToolCallIndicator name={pendingToolCall} />}
      <div ref={bottomRef} />
    </div>
  );
}
