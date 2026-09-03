"use client";

import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (value: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-border flex items-end gap-2 border-t p-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about a character or episode..."
        rows={1}
        aria-label="Chat message"
        className="border-border bg-surface placeholder:text-foreground/40 focus-visible:border-accent max-h-24 flex-1 resize-none rounded-md border px-3 py-2 text-sm transition-colors focus-visible:shadow-[0_0_0_3px_var(--glow-accent)] focus-visible:outline-none"
      />
      <Button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="h-10 w-10 shrink-0 rounded-full p-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
