import { beforeEach, describe, expect, it } from "vitest";
import {
  markModelHealthy,
  markModelUnavailable,
  orderByAvailability,
  resetModelHealth,
} from "./modelHealth";

const overloaded = new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}');

describe("model health", () => {
  beforeEach(() => resetModelHealth());

  it("leaves the caller's order untouched while every model is healthy", () => {
    expect(orderByAvailability(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("pushes a model that just refused to the back of the queue", () => {
    markModelUnavailable("a", overloaded, false);

    expect(orderByAvailability(["a", "b", "c"])).toEqual(["b", "c", "a"]);
  });

  it("never drops a model, so an all-down chain is still attempted", () => {
    markModelUnavailable("a", overloaded, false);
    markModelUnavailable("b", overloaded, false);

    expect(orderByAvailability(["a", "b"]).sort()).toEqual(["a", "b"]);
  });

  it("restores a model to the front once its cooldown expires", () => {
    markModelUnavailable("a", overloaded, false);
    const wellPastCooldown = Date.now() + 60 * 60 * 1000;

    expect(orderByAvailability(["a", "b"], wellPastCooldown)).toEqual(["a", "b"]);
  });

  it("clears the cooldown as soon as a model answers again", () => {
    markModelUnavailable("a", overloaded, false);
    markModelHealthy("a");

    expect(orderByAvailability(["a", "b"])).toEqual(["a", "b"]);
  });

  it("honours a retryDelay the provider supplied over the default cooldown", () => {
    const withRetryDelay = new Error(
      '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"600s"}]}}',
    );
    markModelUnavailable("a", withRetryDelay, true);

    // 600s is longer than the default quota cooldown, so it must win.
    const afterDefaultCooldown = Date.now() + 301_000;
    expect(orderByAvailability(["a", "b"], afterDefaultCooldown)).toEqual(["b", "a"]);
  });
});
