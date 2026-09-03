import { cn } from "@/lib/utils/cn";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-accent text-accent-foreground border-transparent"
            : "border-border bg-surface-muted text-foreground",
        )}
      >
        {message.content || <span className="opacity-50">...</span>}
      </div>
    </div>
  );
}
