import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_MAX_MESSAGES } from "@/lib/constants";

const { checkClientRateLimit, orchestrateChat } = vi.hoisted(() => ({
  checkClientRateLimit: vi.fn(),
  orchestrateChat: vi.fn(),
}));

vi.mock("@/lib/chat/rateLimit", () => ({
  checkClientRateLimit,
  getClientIdentity: () => ({ key: "ip:203.0.113.1", trusted: true }),
}));

vi.mock("@/lib/gemini/orchestrate", () => ({ orchestrateChat }));

const { POST } = await import("./route");

function post(body: string): Request {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

const validBody = JSON.stringify({ messages: [{ role: "user", content: "Hi" }] });

beforeEach(() => {
  vi.clearAllMocks();
  checkClientRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  orchestrateChat.mockImplementation(async function* () {
    yield { type: "token", value: "hello" };
    yield { type: "done" };
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/chat", () => {
  it("streams NDJSON events on a valid request", async () => {
    const response = await POST(post(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    await expect(response.text()).resolves.toContain('"type":"token"');
  });

  it("rejects a malformed JSON body with 400", async () => {
    const response = await POST(post("{not json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid JSON body." });
    expect(orchestrateChat).not.toHaveBeenCalled();
  });

  it("rejects a body that fails validation with 400 and says why", async () => {
    const response = await POST(post(JSON.stringify({ messages: [] })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/^Invalid request: /);
    expect(body.details).toBeDefined();
    expect(orchestrateChat).not.toHaveBeenCalled();
  });

  it("rejects a conversation longer than the cap", async () => {
    const messages = Array.from({ length: CHAT_MAX_MESSAGES + 1 }, () => ({
      role: "user",
      content: "Hi",
    }));

    const response = await POST(post(JSON.stringify({ messages })));

    expect(response.status).toBe(400);
  });

  it("returns 429 with Retry-After once the rate limit is exceeded", async () => {
    checkClientRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 4_200 });

    const response = await POST(post(validBody));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
    // Blocked before the body is even parsed, so no model work is started.
    expect(orchestrateChat).not.toHaveBeenCalled();
  });

  it("returns 503 when the server has no API key configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await POST(post(validBody));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "The chat assistant is not configured on this server.",
    });
    expect(orchestrateChat).not.toHaveBeenCalled();
  });
});
