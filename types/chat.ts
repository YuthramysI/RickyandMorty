export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface CharacterContext {
  id: number;
  name: string;
}

export interface ChatRequestBody {
  messages: Pick<ChatMessage, "role" | "content">[];
  characterContext?: CharacterContext;
}

export type ChatStreamEvent =
  | { type: "tool_call"; name: string }
  | { type: "token"; value: string }
  | { type: "done" }
  | { type: "error"; message: string };
