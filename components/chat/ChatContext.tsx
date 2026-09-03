"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CharacterContext as CharacterContextValue } from "@/types/chat";

interface ChatContextValue {
  activeCharacter: CharacterContextValue | null;
  setActiveCharacter: (character: CharacterContextValue | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [activeCharacter, setActiveCharacter] = useState<CharacterContextValue | null>(null);

  const value = useMemo(() => ({ activeCharacter, setActiveCharacter }), [activeCharacter]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatContext must be used within a ChatContextProvider");
  return context;
}
