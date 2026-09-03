import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchByIds, fetchCollection, fetchResource, idFromUrl } from "./client";
import { NotFoundError, RickAndMortyApiError } from "./errors";

function fakeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: new Headers(headers),
    json: async () => body,
  } as Response;
}

describe("idFromUrl", () => {
  it("extracts the trailing numeric id from a resource url", () => {
    expect(idFromUrl("https://rickandmortyapi.com/api/character/42")).toBe(42);
  });

  it("returns null for an empty url", () => {
    expect(idFromUrl("")).toBeNull();
  });

  it("returns null when the trailing segment isn't a positive integer", () => {
    expect(idFromUrl("https://rickandmortyapi.com/api/character/")).toBeNull();
  });
});

describe("fetchResource", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on a successful response", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { id: 1, name: "Rick" }));
    const result = await fetchResource<{ id: number; name: string }>("/character/1", "Character");
    expect(result).toEqual({ id: 1, name: "Rick" });
  });

  it("throws NotFoundError when the resource genuinely doesn't exist", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(404, { error: "not found" }));
    await expect(fetchResource("/character/999999", "Character")).rejects.toThrow(NotFoundError);
  });

  it("retries a transient failure and returns the successful retry", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(fakeResponse(500, {}))
      .mockResolvedValueOnce(fakeResponse(200, { id: 1, name: "Rick" }));
    const result = await fetchResource<{ id: number }>("/character/1", "Character");
    expect(result).toEqual({ id: 1, name: "Rick" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up and throws after exhausting retries on a persistent server error", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(500, {}));
    await expect(fetchResource("/character/1", "Character")).rejects.toThrow(RickAndMortyApiError);
  });
});

describe("fetchCollection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty collection instead of throwing on a filtered 404", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(404, { error: "no results" }));
    const result = await fetchCollection("/character", { name: "zzz" });
    expect(result).toEqual({ info: { count: 0, pages: 0, next: null, prev: null }, results: [] });
  });

  it("returns the parsed collection on success", async () => {
    const body = { info: { count: 1, pages: 1, next: null, prev: null }, results: [{ id: 1 }] };
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, body));
    const result = await fetchCollection("/character");
    expect(result).toEqual(body);
  });
});

describe("fetchByIds", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty array without calling fetch when given no ids", async () => {
    const result = await fetchByIds("/character", []);
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("wraps a single-object response in an array (API quirk for one id)", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { id: 1, name: "Rick" }));
    const result = await fetchByIds<{ id: number }>("/character", [1]);
    expect(result).toEqual([{ id: 1, name: "Rick" }]);
  });
});
