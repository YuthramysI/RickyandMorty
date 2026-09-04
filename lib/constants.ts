// `||` (not `??`) so a blank env var (e.g. left empty in a hosting dashboard)
// falls back too, not just an unset one.
export const RICK_AND_MORTY_API_BASE =
  process.env.RICKANDMORTY_API_BASE || "https://rickandmortyapi.com/api";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Individual Gemini models go temporarily unavailable (503) and each carries its
// own separate daily free-tier quota, so a second model is the difference
// between a degraded answer and no answer at all.
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash";

export const GEMINI_MAX_ATTEMPTS_PER_MODEL = 2;
export const GEMINI_RETRY_BASE_DELAY_MS = 600;

// An overloaded model sometimes stalls instead of rejecting. Without a cap the
// user waits on a request that was never going to arrive, so each attempt is cut
// short and the whole round is bounded - a clear failure beats an endless spinner.
export const GEMINI_OPEN_TIMEOUT_MS = 15_000;
export const GEMINI_TOTAL_BUDGET_MS = 60_000;
export const GEMINI_MIN_OPEN_TIMEOUT_MS = 3_000;

export const CHARACTERS_PAGE_SIZE = 20;

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_TOOL_ROUNDS = 5;

export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;
