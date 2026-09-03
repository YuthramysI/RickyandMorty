import { RICK_AND_MORTY_API_BASE } from "@/lib/constants";
import { NotFoundError, RickAndMortyApiError } from "./errors";
import type { ApiCollection } from "@/types/rickandmorty";

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 300;
const MAX_CONCURRENT_REQUESTS = 6;

/**
 * Caps how many requests this server sends to the upstream API at once.
 * Without this, a page that fans out many lookups at the same time (or many
 * concurrent visitors) can trip the public API's own rate limiting, which is
 * what the retry logic below has to recover from in the first place — this
 * keeps us a "well-behaved" client instead of just reacting after the fact.
 */
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => requestQueue.push(resolve));
  activeRequests++;
}

function releaseSlot(): void {
  activeRequests--;
  requestQueue.shift()?.();
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Without a timeout, a single stalled connection to the upstream (dropped
 * network, slow DNS, etc.) would hang forever - and since `limitedFetch`
 * never returns, it never releases its concurrency slot either. Enough of
 * those piling up over time silently exhausts every slot, and every
 * subsequent lookup queues forever behind them. Aborting after a few
 * seconds guarantees the slot always frees up, win or lose.
 */
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function limitedFetch(url: string, options: RequestInit): Promise<Response> {
  await acquireSlot();
  try {
    return await fetchWithTimeout(url, options);
  } finally {
    releaseSlot();
  }
}

/** Resolves to `null` (instead of throwing) on a timeout or network error, so
 * the retry loop below can treat it the same way it treats a bad status code. */
async function attemptFetch(url: string, options: RequestInit): Promise<Response | null> {
  try {
    return await limitedFetch(url, options);
  } catch {
    return null;
  }
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${RICK_AND_MORTY_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 429/5xx are always transient. A 404 is normally a genuine "not found", but
 * under load the public API has been observed to return a spurious 404 for a
 * character/episode that demonstrably exists — and since the first fetch is
 * tagged with `next.revalidate`, Next.js would otherwise cache that false
 * negative for the full revalidate window, breaking the page for everyone
 * until it expires. Retrying once (bypassing the cache) catches that case
 * too, at the cost of one extra request for a genuinely-missing resource.
 */
function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 429 || status >= 500;
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 5000);
  }
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

async function request(
  path: string,
  params?: Record<string, string | number | undefined>,
  revalidateSeconds = 3600,
): Promise<Response> {
  const url = buildUrl(path, params);
  let response = await attemptFetch(url, { next: { revalidate: revalidateSeconds } });

  for (
    let attempt = 0;
    (!response || (!response.ok && isRetryableStatus(response.status))) &&
    attempt < MAX_ATTEMPTS - 1;
    attempt++
  ) {
    await sleep(response ? retryDelayMs(response, attempt) : BASE_RETRY_DELAY_MS * 2 ** attempt);
    // Bypass the cache on retries so a transient failure never gets served
    // (or re-cached) as the answer once the upstream has recovered.
    response = await attemptFetch(url, { cache: "no-store" });
  }

  if (!response) {
    throw new RickAndMortyApiError("Rick and Morty API request timed out or failed to connect.");
  }
  if (!response.ok && response.status !== 404) {
    throw new RickAndMortyApiError(
      `Rick and Morty API request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  return response;
}

/**
 * For single-resource lookups (e.g. /character/1) a 404 means the resource
 * genuinely doesn't exist.
 */
export async function fetchResource<T>(
  path: string,
  resourceLabel: string,
  revalidateSeconds?: number,
): Promise<T> {
  const response = await request(path, undefined, revalidateSeconds);
  if (response.status === 404) {
    throw new NotFoundError(resourceLabel);
  }
  return (await response.json()) as T;
}

/**
 * For filtered list endpoints (e.g. /character?name=zzz), the API responds
 * with 404 when no results match — that's an empty collection, not an error.
 */
export async function fetchCollection<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  revalidateSeconds?: number,
): Promise<ApiCollection<T>> {
  const response = await request(path, params, revalidateSeconds);
  if (response.status === 404) {
    return { info: { count: 0, pages: 0, next: null, prev: null }, results: [] };
  }
  return (await response.json()) as ApiCollection<T>;
}

/**
 * For multi-id lookups (e.g. /character/1,2,3), the API returns a single
 * object instead of an array when exactly one id is requested.
 */
export async function fetchByIds<T>(
  path: string,
  ids: number[],
  revalidateSeconds?: number,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const response = await request(`${path}/${ids.join(",")}`, undefined, revalidateSeconds);
  if (response.status === 404) return [];
  const data = (await response.json()) as T | T[];
  return Array.isArray(data) ? data : [data];
}

/** Every resource URL from this API ends in its numeric id, e.g. `.../episode/12`. */
export function idFromUrl(url: string): number | null {
  if (!url) return null;
  const id = Number(url.split("/").pop());
  return Number.isInteger(id) && id > 0 ? id : null;
}
