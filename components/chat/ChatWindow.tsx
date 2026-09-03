"use client";

import { X } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useChatContext } from "./ChatContext";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

export function ChatWindow({ onClose }: { onClose: () => void }) {
  const { activeCharacter } = useChatContext();
  const { messages, sendMessage, isStreaming, pendingToolCall, error } = useChat({
    activeCharacter,
  });

  return (
    <div className="border-accent/40 bg-surface/95 glow-border-strong flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border backdrop-blur">
      <div className="border-border from-surface-muted flex items-center justify-between border-b bg-gradient-to-r to-transparent px-4 py-3">
        <div>
          <p className="font-display flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase">
            <span className="bg-accent animate-portal-pulse h-1.5 w-1.5 rounded-full" aria-hidden />
            Interdimensional Comms
          </p>
          {activeCharacter && (
            <p className="text-accent-2 font-mono text-xs">
              {"» linked: "}
              {activeCharacter.name}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="hover:bg-surface-muted hover:text-danger inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ChatMessageList messages={messages} pendingToolCall={pendingToolCall} />

      {error && (
        <p role="alert" className="border-border text-danger border-t px-4 py-2 font-mono text-xs">
          ! {error}
        </p>
      )}

      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
