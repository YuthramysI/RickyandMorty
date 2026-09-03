"use client";

import { useEffect } from "react";
import { useChatContext } from "@/components/chat/ChatContext";

export function SetActiveCharacter({ id, name }: { id: number; name: string }) {
  const { setActiveCharacter } = useChatContext();

  useEffect(() => {
    setActiveCharacter({ id, name });
    return () => setActiveCharacter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name]);

  return null;
}
