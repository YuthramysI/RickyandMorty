import {
  GEMINI_MAX_PASSES,
  GEMINI_MIN_OPEN_TIMEOUT_MS,
  GEMINI_OPEN_TIMEOUT_MS,
  GEMINI_RETRY_BASE_DELAY_MS,
  GEMINI_TOTAL_BUDGET_MS,
} from "@/lib/constants";
import { markModelHealthy, markModelUnavailable, orderByAvailability } from "./modelHealth";

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
 * Runs `open` against candidate models until one works, sweeping the whole list
 * before retrying anything: a 503 means *this* model is swamped, so reaching for
 * a different one recovers faster than waiting on the same one twice.
 *
 * The free tier produces two failures worth handling differently. An overloaded
 * model (503) is temporary, so it stays in the rotation for the next pass. A
 * model whose daily quota is spent (429) will not recover during this request,
 * so it is dropped - but another model has its own separate allowance, which is
 * the only headroom a free key has. Anything else is a real bug and is rethrown
 * immediately rather than burning the budget on it.
 *
 * Every attempt draws from one shared time budget, so a model that stalls cannot
 * spend it all and starve the models behind it.
 *
 * Callers must only use this for work that has produced no user-visible output
 * yet, since moving on restarts that work from scratch.
 */
export async function withModelFallback<T>(
  models: string[],
  open: (model: string, timeoutMs: number) => Promise<T>,
  budgetMs: number = GEMINI_TOTAL_BUDGET_MS,
): Promise<{ value: T; model: string }> {
  const deadline = Date.now() + budgetMs;
  // Models that refused a recent request go last, so an ongoing outage is not
  // rediscovered from scratch on every single message.
  const rotation = orderByAvailability(models);
  let lastError: unknown;

  for (let pass = 0; pass < GEMINI_MAX_PASSES && rotation.length > 0; pass++) {
    if (pass > 0) {
      const delay = GEMINI_RETRY_BASE_DELAY_MS * 2 ** (pass - 1);
      if (deadline - Date.now() <= delay) break;
      await sleep(delay);
    }

    for (const model of [...rotation]) {
      const timeoutMs = Math.min(GEMINI_OPEN_TIMEOUT_MS, deadline - Date.now());
      // Too little left to be worth starting: fail with what we already know
      // rather than burning the remainder on an attempt that cannot finish.
      if (timeoutMs < GEMINI_MIN_OPEN_TIMEOUT_MS) {
        throw lastError ?? new GeminiTimeoutError(model, budgetMs);
      }

      try {
        const value = await open(model, timeoutMs);
        markModelHealthy(model);
        return { value, model };
      } catch (error) {
        // The user only ever sees a friendly summary, so without this the
        // provider's actual reason for refusing is lost and a production
        // outage is indistinguishable from a bug in this file.
        console.error(`Gemini model "${model}" failed:`, error);
        lastError = error;

        const quotaSpent = isQuotaError(error);
        if (!quotaSpent && !isOverloadedError(error)) throw error;

        markModelUnavailable(model, error, quotaSpent);
        if (quotaSpent) rotation.splice(rotation.indexOf(model), 1);
      }
    }
  }

  throw lastError;
}
