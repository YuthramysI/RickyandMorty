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
  it("uses the first model when it works and never touches the others", async () => {
    const open = vi.fn().mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "second", "third"], open);

    expect(result).toEqual({ value: "stream", model: "primary" });
    expect(modelsTried(open)).toEqual(["primary"]);
  });

  it("moves to the next model rather than retrying an overloaded one", async () => {
    const open = vi.fn().mockRejectedValueOnce(overloaded()).mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "second", "third"], open);

    expect(result.model).toBe("second");
    expect(modelsTried(open)).toEqual(["primary", "second"]);
  });

  it("sweeps every model before giving any of them a second attempt", async () => {
    const open = vi
      .fn()
      .mockRejectedValueOnce(overloaded())
      .mockRejectedValueOnce(overloaded())
      .mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "second"], open);

    // "primary" is only revisited after "second" has also been tried.
    expect(result.model).toBe("primary");
    expect(modelsTried(open)).toEqual(["primary", "second", "primary"]);
  });

  it("retries a single pinned model when there is nothing to fall back to", async () => {
    const open = vi.fn().mockRejectedValueOnce(overloaded()).mockResolvedValue("stream");

    const result = await withModelFallback(["pinned"], open);

    expect(result.model).toBe("pinned");
    expect(modelsTried(open)).toEqual(["pinned", "pinned"]);
  });

  it("drops a model whose daily quota is spent instead of revisiting it", async () => {
    const open = vi.fn().mockRejectedValueOnce(quotaSpent()).mockRejectedValue(overloaded());

    await expect(withModelFallback(["primary", "second"], open)).rejects.toThrow("UNAVAILABLE");

    // Quota does not recover mid-request, so "primary" is never tried again.
    expect(modelsTried(open)).toEqual(["primary", "second", "second"]);
  });

  it("rethrows a genuine error immediately instead of burning the budget", async () => {
    const open = vi.fn().mockRejectedValue(new Error("400 INVALID_ARGUMENT"));

    await expect(withModelFallback(["primary", "second"], open)).rejects.toThrow(
      "INVALID_ARGUMENT",
    );
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last failure when every model is unavailable", async () => {
    const open = vi.fn().mockRejectedValue(overloaded());

    await expect(withModelFallback(["primary", "second"], open)).rejects.toThrow("UNAVAILABLE");
    expect(modelsTried(open)).toEqual(["primary", "second", "primary", "second"]);
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
      .mockResolvedValue("stream");

    const result = await withModelFallback(["primary", "second"], open);

    expect(result.model).toBe("second");
  });
});
