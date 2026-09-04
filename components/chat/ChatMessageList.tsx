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
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingToolCall]);

  // One stable container that is always mounted and always marked
  // untranslatable. Swapping between two different wrappers (an empty state
  // and a populated list) meant the browser's auto-translate could rewrite the
  // first one's text nodes, and React then crashed removing that stale node.
  return (
    <div
      className={`notranslate flex flex-1 flex-col overflow-y-auto ${
        isEmpty ? "items-center justify-center px-6 text-center" : "gap-3 px-4 py-4"
      }`}
      role="log"
      aria-live="polite"
      translate="no"
    >
      {isEmpty ? (
        <div className="text-foreground/70 flex flex-col items-center gap-2 text-sm">
          <span className="text-accent font-mono text-xs tracking-widest uppercase">
            [ signal open ]
          </span>
          Ask me anything about Rick and Morty characters or episodes - I&apos;ll look up real data
          to answer.
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {pendingToolCall && <ToolCallIndicator name={pendingToolCall} />}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
