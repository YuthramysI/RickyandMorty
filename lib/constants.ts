export const RICK_AND_MORTY_API_BASE =
  process.env.RICKANDMORTY_API_BASE ?? "https://rickandmortyapi.com/api";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

export const CHARACTERS_PAGE_SIZE = 20;

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_TOOL_ROUNDS = 5;

export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;
