import { beforeEach, describe, expect, it } from "vitest";
import {
  allowsDisabledThinking,
  isInvalidArgumentError,
  rememberRequiresThinking,
  resetThinkingSupport,
} from "./thinkingSupport";

describe("thinking-budget support cache", () => {
  beforeEach(() => resetThinkingSupport());

  it("optimistically assumes a model accepts a disabled thinking budget", () => {
    // Assuming otherwise would give up the latency win on every unknown model.
    expect(allowsDisabledThinking("gemini-3.1-flash-lite")).toBe(true);
  });

  it("stops asking once a model has refused", () => {
    rememberRequiresThinking("gemini-3.6-flash");

    expect(allowsDisabledThinking("gemini-3.6-flash")).toBe(false);
    // The refusal is per model, not global.
    expect(allowsDisabledThinking("gemini-3.8-flash")).toBe(true);
  });

  it("recognises the refusal as an invalid-argument error", () => {
    const refusal = new Error(
      '{"error":{"code":400,"message":"Request contains an invalid argument.","status":"INVALID_ARGUMENT"}}',
    );

    expect(isInvalidArgumentError(refusal)).toBe(true);
  });

  it("does not mistake an overload or quota failure for a refused budget", () => {
    // Retrying those without the thinking config would waste an attempt and
    // silently give up the latency win on a model that never objected to it.
    expect(isInvalidArgumentError(new Error('{"error":{"status":"UNAVAILABLE"}}'))).toBe(false);
    expect(isInvalidArgumentError(new Error('{"error":{"status":"RESOURCE_EXHAUSTED"}}'))).toBe(
      false,
    );
  });

  it("handles a non-Error rejection without throwing", () => {
    expect(isInvalidArgumentError("INVALID_ARGUMENT")).toBe(true);
    expect(isInvalidArgumentError(undefined)).toBe(false);
  });
});
