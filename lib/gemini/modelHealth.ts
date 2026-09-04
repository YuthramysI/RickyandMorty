import { GEMINI_OVERLOADED_COOLDOWN_MS, GEMINI_QUOTA_COOLDOWN_MS } from "@/lib/constants";

/**
 * Remembers which models just turned a request away.
 *
 * Without this, every request rediscovers the same outage from scratch: a chain
 * of four models with three of them down costs seconds of dead waiting *per
 * request*, and free-tier outages last hours. Recording a short cooldown lets
 * the next request start with a model that is actually answering.
 *
 * The state is per process, so on serverless it is shared only within a warm
 * instance and lost on a cold start - a latency optimisation, never a
 * correctness guarantee, which is why cooled-down models are reordered rather
 * than removed.
 */
const unavailableUntil = new Map<string, number>();

/** Providers often say when to come back; prefer their number over a guess. */
function parseRetryDelayMs(error: unknown): number | null {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  if (!match) return null;
  return Math.round(Number(match[1]) * 1000);
}

export function markModelUnavailable(model: string, error: unknown, isQuota: boolean): void {
  const suggested = parseRetryDelayMs(error);
  const fallback = isQuota ? GEMINI_QUOTA_COOLDOWN_MS : GEMINI_OVERLOADED_COOLDOWN_MS;
  unavailableUntil.set(model, Date.now() + Math.max(suggested ?? 0, fallback));
}

export function markModelHealthy(model: string): void {
  unavailableUntil.delete(model);
}

/**
 * Healthy models first, cooling-down ones after, each group keeping the
 * caller's preference order. Nothing is dropped: a cooldown is a hint, and if
 * every candidate is cooling down the request still tries them all.
 */
export function orderByAvailability(models: string[], now: number = Date.now()): string[] {
  const available: string[] = [];
  const cooling: string[] = [];

  for (const model of models) {
    const until = unavailableUntil.get(model);
    if (until === undefined || until <= now) {
      available.push(model);
    } else {
      cooling.push(model);
    }
  }

  return [...available, ...cooling];
}

/** Test seam: the map outlives individual requests by design. */
export function resetModelHealth(): void {
  unavailableUntil.clear();
}
