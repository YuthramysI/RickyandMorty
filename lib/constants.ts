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
  process.env.GEMINI_FALLBACK_MODELS || "gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

// Trying a *different* model beats retrying a swamped one, so each pass sweeps
// the whole list before any model is attempted a second time.
export const GEMINI_MAX_PASSES = 2;
export const GEMINI_RETRY_BASE_DELAY_MS = 600;

// The assistant summarises looked-up facts; it has nothing to deliberate about.
// Measured on the live API, disabling reasoning cut a one-sentence answer from
// ~10s to ~1s with identical output. Models that reject it are detected at
// runtime (lib/gemini/thinkingSupport.ts) rather than hard-coded here.
export const GEMINI_THINKING_BUDGET = 0;

// An overloaded model sometimes stalls instead of rejecting. Without a cap the
// user waits on a request that was never going to arrive, so each attempt is cut
// short and the whole round is bounded - a clear failure beats an endless spinner.
export const GEMINI_OPEN_TIMEOUT_MS = 10_000;

// How long a model that just refused is treated as the least promising choice.
// A spike passes in seconds; a spent quota does not, so it waits longer.
export const GEMINI_OVERLOADED_COOLDOWN_MS = 30_000;
export const GEMINI_QUOTA_COOLDOWN_MS = 300_000;
export const GEMINI_TOTAL_BUDGET_MS = 60_000;
export const GEMINI_MIN_OPEN_TIMEOUT_MS = 3_000;

export const CHARACTERS_PAGE_SIZE = 20;

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_TOOL_ROUNDS = 5;

export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Only a header written by infrastructure the client cannot bypass identifies a
 * caller; anything the client sends is a claim, not a fact. Vercel overwrites
 * `x-vercel-forwarded-for` on the way in, so it is trustworthy there. Set this
 * explicitly when fronting the app with your own proxy; leave it empty and the
 * limiter falls back to a global ceiling instead of pretending to know who is
 * calling.
 */
export const TRUSTED_CLIENT_IP_HEADER =
  process.env.TRUSTED_CLIENT_IP_HEADER || (process.env.VERCEL ? "x-vercel-forwarded-for" : "");

// Applies to all requests whose origin could not be established. Self-declared
// identities can be rotated at will, so a per-claim bucket enforces nothing on
// its own; this ceiling is what actually bounds unidentified traffic.
export const RATE_LIMIT_UNTRUSTED_CEILING = 60;

// Hard bound on the limiter's bookkeeping, so a flood of forged identities
// cannot grow the map without limit between window sweeps.
export const RATE_LIMIT_MAX_TRACKED_CLIENTS = 5_000;
