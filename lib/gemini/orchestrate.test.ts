import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_MAX_TOOL_ROUNDS } from "@/lib/constants";
import type { ChatStreamEvent } from "@/types/chat";

const { generateContentStream, searchCharacters } = vi.hoisted(() => ({
  generateContentStream: vi.fn(),
  searchCharacters: vi.fn(),
}));

vi.mock("./client", () => ({
  getGeminiClient: () => ({ models: { generateContentStream } }),
}));

vi.mock("./tools", () => ({
  toolDeclarations: [{ name: "searchCharacters", description: "stub" }],
  toolHandlers: { searchCharacters },
}));

const { orchestrateChat } = await import("./orchestrate");

function streamOf(chunks: unknown[]) {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}

const toolCallChunk = (name: string, args: Record<string, unknown> = {}) => ({
  candidates: [{ content: { parts: [{ functionCall: { id: "call-1", name, args } }] } }],
});

const textChunk = (text: string) => ({ candidates: [{ content: { parts: [] } }], text });

async function collect(events: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const collected: ChatStreamEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

/** The orchestrator mutates one contents array across rounds, so snapshot it per call. */
function captureContents(): Record<string, unknown>[][] {
  const snapshots: Record<string, unknown>[][] = [];
  generateContentStream.mockImplementation(async ({ contents }: { contents: unknown }) => {
    snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
    return streamOf([]);
  });
  return snapshots;
}

const ask = () => orchestrateChat([{ role: "user", content: "Who is Rick?" }]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orchestrateChat tool loop", () => {
  it("runs a tool call, feeds the result back, and streams the second round's answer", async () => {
    const snapshots = captureContents();
    searchCharacters.mockResolvedValue({ results: [{ id: 1, name: "Rick Sanchez" }] });
    generateContentStream
      .mockImplementationOnce(async ({ contents }: { contents: unknown }) => {
        snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
        return streamOf([toolCallChunk("searchCharacters", { name: "Rick" })]);
      })
      .mockImplementationOnce(async ({ contents }: { contents: unknown }) => {
        snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
        return streamOf([textChunk("Rick Sanchez is "), textChunk("a scientist.")]);
      });

    const events = await collect(ask());

    expect(events).toEqual([
      { type: "tool_call", name: "searchCharacters" },
      { type: "token", value: "Rick Sanchez is " },
      { type: "token", value: "a scientist." },
      { type: "done" },
    ]);
    expect(searchCharacters).toHaveBeenCalledWith({ name: "Rick" });

    // The second round must carry the model's call and the tool's response.
    const secondRound = JSON.stringify(snapshots[1]);
    expect(secondRound).toContain("functionCall");
    expect(secondRound).toContain("functionResponse");
    expect(secondRound).toContain("Rick Sanchez");
  });

  it("turns a failing tool into structured data instead of breaking the stream", async () => {
    const snapshots: Record<string, unknown>[][] = [];
    searchCharacters.mockRejectedValue(new Error("upstream exploded"));
    generateContentStream
      .mockImplementationOnce(async ({ contents }: { contents: unknown }) => {
        snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
        return streamOf([toolCallChunk("searchCharacters")]);
      })
      .mockImplementationOnce(async ({ contents }: { contents: unknown }) => {
        snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
        return streamOf([textChunk("I couldn't look that up.")]);
      });

    const events = await collect(ask());

    // No error event: the model gets to read the failure and reply around it.
    expect(events.map((event) => event.type)).toEqual(["tool_call", "token", "done"]);
    expect(JSON.stringify(snapshots[1])).toContain("upstream exploded");
  });

  it("stops after CHAT_MAX_TOOL_ROUNDS when the model keeps asking for tools", async () => {
    searchCharacters.mockResolvedValue({ ok: true });
    generateContentStream.mockImplementation(async () =>
      streamOf([toolCallChunk("searchCharacters")]),
    );

    const events = await collect(ask());

    expect(generateContentStream).toHaveBeenCalledTimes(CHAT_MAX_TOOL_ROUNDS);
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(events.at(-2)).toMatchObject({ type: "token" });
    expect(events.filter((event) => event.type === "tool_call")).toHaveLength(CHAT_MAX_TOOL_ROUNDS);
  });

  it("reports an unknown tool back to the model rather than throwing", async () => {
    const snapshots: Record<string, unknown>[][] = [];
    generateContentStream
      .mockImplementationOnce(async () => streamOf([toolCallChunk("noSuchTool")]))
      .mockImplementationOnce(async ({ contents }: { contents: unknown }) => {
        snapshots.push(structuredClone(contents) as Record<string, unknown>[]);
        return streamOf([textChunk("Let me try another way.")]);
      });

    const events = await collect(ask());

    expect(events.map((event) => event.type)).toEqual(["tool_call", "token", "done"]);
    expect(JSON.stringify(snapshots[0])).toContain("Unknown tool");
  });

  it("surfaces a friendly message when the provider refuses every model", async () => {
    generateContentStream.mockRejectedValue(
      new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"quota"}}'),
    );

    const events = await collect(ask());

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error" });
    expect((events[0] as { message: string }).message).toContain("usage limit");
  });
});
