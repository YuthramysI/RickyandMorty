import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MAX_TRACKED_CLIENTS,
  RATE_LIMIT_UNTRUSTED_CEILING,
  RATE_LIMIT_WINDOW_MS,
  TRUSTED_CLIENT_IP_HEADER,
} from "@/lib/constants";

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Best-effort in-memory fixed-window limiter. State lives in module scope, so
 * it only holds within a single warm serverless instance — it will not
 * enforce a global limit across concurrent instances or survive cold starts.
 * That's an acceptable simplification for a portfolio demo; see the README
 * for the production upgrade path (e.g. an edge KV-backed limiter).
 */
const buckets = new Map<string, Bucket>();

/** Bucket shared by every request whose origin could not be established. */
const UNTRUSTED_CEILING_KEY = "untrusted:ceiling";

let lastSweep = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export interface ClientIdentity {
  key: string;
  /** True only when the key came from a source the caller cannot forge. */
  trusted: boolean;
}

function isExpired(bucket: Bucket, now: number): boolean {
  return now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS;
}

/**
 * Drops finished windows and keeps the map bounded.
 *
 * Every distinct key used to add an entry that was never removed, so a long
 * lived instance leaked memory in proportion to the number of callers it had
 * ever seen. Sweeping at most once per window keeps that cost amortised; the
 * eviction below is the backstop for a burst of unique keys arriving faster
 * than windows expire.
 */
function pruneBuckets(now: number): void {
  const sweepIsDue = now < lastSweep || now - lastSweep >= RATE_LIMIT_WINDOW_MS;
  const overCapacity = buckets.size >= RATE_LIMIT_MAX_TRACKED_CLIENTS;
  if (!sweepIsDue && !overCapacity) return;

  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (isExpired(bucket, now)) buckets.delete(key);
  }

  if (buckets.size < RATE_LIMIT_MAX_TRACKED_CLIENTS) return;

  // Still full of live windows: evict the oldest. Those callers get a fresh
  // window, which is exactly what expiry would have given them anyway.
  const excess = buckets.size - RATE_LIMIT_MAX_TRACKED_CLIENTS + 1;
  const oldestFirst = [...buckets.entries()].sort(([, a], [, b]) => a.windowStart - b.windowStart);
  for (const [key] of oldestFirst.slice(0, excess)) {
    buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const bucket = buckets.get(key);

  if (!bucket || isExpired(bucket, now)) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Identifies the caller from infrastructure-supplied data only.
 *
 * `x-forwarded-for` is deliberately not consulted: with no proxy in front of
 * the app it is attacker-controlled, so rotating it reset the counter and the
 * limit enforced nothing at all.
 */
export function getClientIdentity(request: Request): ClientIdentity {
  if (TRUSTED_CLIENT_IP_HEADER) {
    const ip = request.headers.get(TRUSTED_CLIENT_IP_HEADER)?.split(",")[0]?.trim();
    if (ip) return { key: `ip:${ip}`, trusted: true };
  }

  // No trusted source. The claimed address still separates ordinary callers so
  // one of them cannot exhaust everybody's allowance, but it is a claim, not an
  // identity — `checkClientRateLimit` is what stops it being rotated for free.
  const claimed = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { key: claimed ? `claimed-ip:${claimed}` : "claimed-ip:none", trusted: false };
}

/**
 * Applies the per-client limit, plus a shared ceiling when the caller could not
 * be identified.
 *
 * Two tiers rather than one because each alone fails: a per-claim bucket is
 * reset by editing a header, while a single shared bucket lets one caller lock
 * everyone else out. Together, ordinary callers keep their own allowance and
 * rotating headers buys nothing beyond the ceiling. Set
 * `TRUSTED_CLIENT_IP_HEADER` to get real per-client limits.
 */
export function checkClientRateLimit(identity: ClientIdentity): RateLimitResult {
  const perClient = checkRateLimit(identity.key);
  if (identity.trusted || !perClient.allowed) return perClient;

  // Consulted only after the per-claim budget allowed the request, so a caller
  // that is already blocked does not also spend from the shared allowance.
  return checkRateLimit(UNTRUSTED_CEILING_KEY, RATE_LIMIT_UNTRUSTED_CEILING);
}

/** Test seam: the limiter's state intentionally outlives individual requests. */
export function resetRateLimit(): void {
  buckets.clear();
  lastSweep = Date.now();
}

/** Test seam: lets a test assert the map does not grow without bound. */
export function trackedClientCount(): number {
  return buckets.size;
}
