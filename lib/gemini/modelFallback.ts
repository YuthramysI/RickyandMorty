import {
  GEMINI_MAX_ATTEMPTS_PER_MODEL,
  GEMINI_MIN_OPEN_TIMEOUT_MS,
  GEMINI_OPEN_TIMEOUT_MS,
  GEMINI_RETRY_BASE_DELAY_MS,
  GEMINI_TOTAL_BUDGET_MS,
} from "@/lib/constants";

/** Raised when a model accepted the request but never started responding. */
export class GeminiTimeoutError extends Error {
  constructor(model: string, timeoutMs: number) {
    super(`Gemini model "${model}" did not start responding within ${timeoutMs}ms. UNAVAILABLE`);
    this.name = "GeminiTimeoutError";
  }
}

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The model is up but swamped. Temporary by definition - worth waiting for. */
export function isOverloadedError(error: unknown): boolean {
  if (error instanceof GeminiTimeoutError) return true;
  const raw = rawMessage(error);
  return raw.includes("UNAVAILABLE") || raw.includes("503");
}

/** The daily free-tier allowance for this model is spent. Retrying won't help. */
export function isQuotaError(error: unknown): boolean {
  const raw = rawMessage(error);
  return raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429") || raw.includes("quota");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `open` against each candidate model until one works.
 *
 * Google's free tier produces two failures worth handling differently: a model
 * that is temporarily overloaded (503 - retry it, the spike usually passes) and
 * one whose daily quota is spent (429 - retrying is pointless, but a different
 * model has its own separate allowance). Anything else is a real bug and is
 * rethrown immediately rather than burning attempts on it.
 *
 * Every attempt gets a slice of a shared time budget, so a model that stalls
 * cannot spend the whole budget on its own and starve the fallback.
 *
 * Callers must only use this for work that has produced no user-visible output
 * yet, since a retry restarts that work from scratch.
 */
export async function withModelFallback<T>(
  models: string[],
  open: (model: string, timeoutMs: number) => Promise<T>,
  budgetMs: number = GEMINI_TOTAL_BUDGET_MS,
): Promise<{ value: T; model: string }> {
  const deadline = Date.now() + budgetMs;
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const timeoutMs = Math.min(GEMINI_OPEN_TIMEOUT_MS, deadline - Date.now());
      // Too little left to be worth starting: fail with what we already know
      // rather than burning the remainder on an attempt that cannot finish.
      if (timeoutMs < GEMINI_MIN_OPEN_TIMEOUT_MS) {
        throw lastError ?? new GeminiTimeoutError(model, budgetMs);
      }

      try {
        return { value: await open(model, timeoutMs), model };
      } catch (error) {
        lastError = error;

        if (isQuotaError(error)) break;
        if (!isOverloadedError(error)) throw error;

        const isLastAttempt = attempt === GEMINI_MAX_ATTEMPTS_PER_MODEL - 1;
        if (!isLastAttempt) await sleep(GEMINI_RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}
