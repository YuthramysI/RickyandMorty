/**
 * Turning off the model's internal reasoning is by far the biggest latency win
 * available here: measured against the live API, the same one-sentence answer
 * took ~10s with reasoning enabled and ~1s with a zero thinking budget, for
 * identical output. Summarising a cartoon character's data needs no deliberation.
 *
 * Not every model accepts a zero budget though - some reject the request
 * outright with INVALID_ARGUMENT - and which ones do changes as the lineup is
 * revised. A hard-coded list would rot silently, so each model is asked once and
 * its refusal is remembered for the life of the process.
 */
const refusesDisabledThinking = new Set<string>();

export function allowsDisabledThinking(model: string): boolean {
  return !refusesDisabledThinking.has(model);
}

export function rememberRequiresThinking(model: string): void {
  refusesDisabledThinking.add(model);
}

/** A malformed-request refusal, which is how a model rejects a budget it won't take. */
export function isInvalidArgumentError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.includes("INVALID_ARGUMENT");
}

/** Test seam: the cache deliberately outlives individual requests. */
export function resetThinkingSupport(): void {
  refusesDisabledThinking.clear();
}
