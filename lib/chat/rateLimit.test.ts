import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";
import { RATE_LIMIT_MAX_REQUESTS } from "@/lib/constants";

function uniqueKey(label: string): string {
  return `${label}-${Math.random().toString(36).slice(2)}`;
}

describe("checkRateLimit", () => {
  it("allows requests up to the configured limit", () => {
    const key = uniqueKey("allow");
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded within the window", () => {
    const key = uniqueKey("block");
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) checkRateLimit(keyA);
    expect(checkRateLimit(keyA).allowed).toBe(false);
    expect(checkRateLimit(keyB).allowed).toBe(true);
  });
});
