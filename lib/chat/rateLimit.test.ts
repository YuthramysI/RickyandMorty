import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MAX_TRACKED_CLIENTS,
  RATE_LIMIT_UNTRUSTED_CEILING,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";

const TRUSTED_HEADER = "x-vercel-forwarded-for";

/**
 * The trusted-header name is read at module load, so each suite imports a fresh
 * copy of the module with the environment it needs.
 */
async function loadLimiter(trustedHeader: string) {
  vi.resetModules();
  vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", trustedHeader);
  return import("./rateLimit");
}

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/chat", { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  let limiter: typeof import("./rateLimit");

  beforeEach(async () => {
    limiter = await loadLimiter(TRUSTED_HEADER);
    limiter.resetRateLimit();
  });

  it("allows requests up to the configured limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(limiter.checkRateLimit("allow").allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded within the window", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) limiter.checkRateLimit("block");

    const result = limiter.checkRateLimit("block");

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) limiter.checkRateLimit("a");

    expect(limiter.checkRateLimit("a").allowed).toBe(false);
    expect(limiter.checkRateLimit("b").allowed).toBe(true);
  });
});

describe("client identity behind a trusted proxy", () => {
  let limiter: typeof import("./rateLimit");

  beforeEach(async () => {
    limiter = await loadLimiter(TRUSTED_HEADER);
    limiter.resetRateLimit();
  });

  it("gives two different clients separate buckets", () => {
    const alice = limiter.getClientIdentity(requestWith({ [TRUSTED_HEADER]: "203.0.113.1" }));
    const bob = limiter.getClientIdentity(requestWith({ [TRUSTED_HEADER]: "203.0.113.2" }));

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) limiter.checkClientRateLimit(alice);

    expect(limiter.checkClientRateLimit(alice).allowed).toBe(false);
    expect(limiter.checkClientRateLimit(bob).allowed).toBe(true);
  });

  it("ignores a spoofed x-forwarded-for, so rotating it cannot reset the counter", () => {
    const exhaust = () => {
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        limiter.checkClientRateLimit(
          limiter.getClientIdentity(requestWith({ [TRUSTED_HEADER]: "203.0.113.7" })),
        );
      }
    };
    exhaust();

    // Same real client, now rotating the forgeable header on every request.
    for (const forged of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
      const identity = limiter.getClientIdentity(
        requestWith({ [TRUSTED_HEADER]: "203.0.113.7", "x-forwarded-for": forged }),
      );
      expect(identity.trusted).toBe(true);
      expect(limiter.checkClientRateLimit(identity).allowed).toBe(false);
    }
  });
});

describe("client identity with no trusted proxy", () => {
  let limiter: typeof import("./rateLimit");

  beforeEach(async () => {
    limiter = await loadLimiter("");
    limiter.resetRateLimit();
  });

  it("does not put every caller in one bucket", () => {
    const alice = limiter.getClientIdentity(requestWith({ "x-forwarded-for": "203.0.113.1" }));
    const bob = limiter.getClientIdentity(requestWith({ "x-forwarded-for": "203.0.113.2" }));

    expect(alice.trusted).toBe(false);
    expect(alice.key).not.toBe(bob.key);

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) limiter.checkClientRateLimit(alice);

    // One caller exhausting its allowance must not lock everyone else out.
    expect(limiter.checkClientRateLimit(alice).allowed).toBe(false);
    expect(limiter.checkClientRateLimit(bob).allowed).toBe(true);
  });

  it("caps header rotation with a shared ceiling instead of granting free requests", () => {
    let allowed = 0;
    // A fresh forged address every single time: each gets its own per-claim
    // bucket, so only the ceiling stands between this and unlimited traffic.
    for (let i = 0; i < RATE_LIMIT_UNTRUSTED_CEILING * 2; i++) {
      const identity = limiter.getClientIdentity(requestWith({ "x-forwarded-for": `10.0.0.${i}` }));
      if (limiter.checkClientRateLimit(identity).allowed) allowed += 1;
    }

    expect(allowed).toBe(RATE_LIMIT_UNTRUSTED_CEILING);
  });
});

describe("bucket bookkeeping", () => {
  let limiter: typeof import("./rateLimit");

  beforeEach(async () => {
    limiter = await loadLimiter(TRUSTED_HEADER);
    limiter.resetRateLimit();
  });

  it("removes expired windows instead of keeping them forever", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 50; i++) limiter.checkRateLimit(`caller-${i}`);
    expect(limiter.trackedClientCount()).toBe(50);

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);
    limiter.checkRateLimit("someone-new");

    // The 50 finished windows are gone; only the new caller remains.
    expect(limiter.trackedClientCount()).toBe(1);
  });

  it("stays bounded when unique keys arrive faster than windows expire", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    // All within one window, so nothing can expire naturally.
    for (let i = 0; i < RATE_LIMIT_MAX_TRACKED_CLIENTS + 500; i++) {
      limiter.checkRateLimit(`forged-${i}`);
    }

    expect(limiter.trackedClientCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_TRACKED_CLIENTS);
  });
});
