import { describe, expect, it, vi } from "vitest";
import { GeminiTimeoutError, withModelFallback } from "./modelFallback";

const overloaded = () =>
  new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}');
const quotaSpent = () =>
  new Error('{"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}}');

/** `open` also receives a timeout; these assertions only care which model was tried. */
const modelsTried = (open: { mock: { calls: unknown[][] } }) =>
  open.mock.calls.map((call) => call[0]);

describe("withModelFallback", () => {
  it("uses the first model when it works and never touches the fallback", async () => {
    const open = vi.fn().mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "fallback"], open);

    expect(result).toEqual({ value: "stream", model: "primary" });
    expect(open).toHaveBeenCalledTimes(1);
    expect(modelsTried(open)).toEqual(["primary"]);
  });

  it("retries the same model when it is temporarily overloaded", async () => {
    const open = vi.fn().mockRejectedValueOnce(overloaded()).mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "fallback"], open);

    expect(result.model).toBe("primary");
    expect(modelsTried(open)).toEqual(["primary", "primary"]);
  });

  it("moves to the fallback model once the primary exhausts its attempts", async () => {
    const open = vi
      .fn()
      .mockRejectedValueOnce(overloaded())
      .mockRejectedValueOnce(overloaded())
      .mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "fallback"], open);

    expect(result).toEqual({ value: "stream", model: "fallback" });
    expect(modelsTried(open)).toEqual(["primary", "primary", "fallback"]);
  });

  it("skips retries on a spent quota and goes straight to the other model", async () => {
    const open = vi.fn().mockRejectedValueOnce(quotaSpent()).mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "fallback"], open);

    // Quota does not recover in milliseconds, so "primary" is tried only once.
    expect(result.model).toBe("fallback");
    expect(modelsTried(open)).toEqual(["primary", "fallback"]);
  });

  it("rethrows a genuine error immediately instead of burning attempts", async () => {
    const open = vi.fn().mockRejectedValue(new Error("400 INVALID_ARGUMENT"));

    await expect(withModelFallback(["primary", "fallback"], open)).rejects.toThrow(
      "INVALID_ARGUMENT",
    );
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last failure when every model is unavailable", async () => {
    const open = vi.fn().mockRejectedValue(overloaded());

    await expect(withModelFallback(["primary", "fallback"], open)).rejects.toThrow("UNAVAILABLE");
    expect(open).toHaveBeenCalledTimes(4);
  });
});

describe("withModelFallback time budget", () => {
  it("passes each attempt a timeout capped by the remaining budget", async () => {
    const open = vi.fn().mockResolvedValue("stream");

    await withModelFallback(["primary"], open, 5_000);

    const [, timeoutMs] = open.mock.calls[0];
    expect(timeoutMs).toBeLessThanOrEqual(5_000);
    expect(timeoutMs).toBeGreaterThan(0);
  });

  it("stops instead of starting an attempt it cannot finish", async () => {
    const open = vi.fn().mockResolvedValue("stream");

    // A budget below the minimum useful timeout leaves no room for any attempt.
    await expect(withModelFallback(["primary"], open, 10)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("treats a stalled model as retryable and moves on", async () => {
    const open = vi
      .fn()
      .mockRejectedValueOnce(new GeminiTimeoutError("primary", 15_000))
      .mockRejectedValueOnce(new GeminiTimeoutError("primary", 15_000))
      .mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "fallback"], open);

    expect(result.model).toBe("fallback");
  });
});
