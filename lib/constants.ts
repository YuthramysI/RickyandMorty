// `||` (not `??`) so a blank env var (e.g. left empty in a hosting dashboard)
// falls back too, not just an unset one.
export const RICK_AND_MORTY_API_BASE =
  process.env.RICKANDMORTY_API_BASE || "https://rickandmortyapi.com/api";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// On the free tier a model's daily quota and its availability are both per
// model, not per account, and outages hit individual models for hours at a
// time. Spreading across a few of them is the only reliability lever a free
// key actually has. Comma-separated so a deployment can retune without a build.
export const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS || "gemini-3.6-flash,gemini-3.5-flash,gemini-3.8-flash"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

// Trying a *different* model beats retrying a swamped one, so each pass sweeps
// the whole list before any model is attempted a second time.
export const GEMINI_MAX_PASSES = 2;
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
