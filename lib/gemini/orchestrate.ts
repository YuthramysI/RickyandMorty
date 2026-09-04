import {
  createModelContent,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
  type FunctionCall,
  type GoogleGenAI,
  type Part,
} from "@google/genai";
import { getGeminiClient } from "./client";
import { toolDeclarations, toolHandlers } from "./tools";
import { buildSystemInstruction } from "./systemPrompt";
import { friendlyGeminiErrorMessage } from "./errors";
import { GeminiTimeoutError, withModelFallback } from "./modelFallback";
import {
  CHAT_MAX_TOOL_ROUNDS,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL,
  GEMINI_TOTAL_BUDGET_MS,
} from "@/lib/constants";
import type { CharacterContext, ChatMessage, ChatStreamEvent } from "@/types/chat";

const MODEL_CANDIDATES = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL])];

type ContentStream = Awaited<ReturnType<GoogleGenAI["models"]["generateContentStream"]>>;

function toGeminiContents(messages: Pick<ChatMessage, "role" | "content">[]): Content[] {
  return messages.map((message) =>
    message.role === "user"
      ? createUserContent(message.content)
      : createModelContent(message.content),
  );
}

async function runFunctionCall(call: FunctionCall): Promise<Record<string, unknown>> {
  const handler = call.name ? toolHandlers[call.name] : undefined;
  if (!handler) {
    return { error: `Unknown tool "${call.name}".` };
  }
  try {
    return await handler(call.args);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tool execution failed." };
  }
}

/**
 * Opens the model stream under a deadline. The timer only guards the wait for
 * the response to *begin* - it is cleared the moment the stream is handed over,
 * so a long answer is never cut off mid-sentence.
 */
async function openStream(
  ai: GoogleGenAI,
  model: string,
  contents: Content[],
  systemInstruction: string,
  timeoutMs: number,
): Promise<ContentStream> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
        abortSignal: controller.signal,
      },
    });
  } catch (error) {
    if (controller.signal.aborted) throw new GeminiTimeoutError(model, timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const FALLBACK_MESSAGE =
  "I wasn't able to pin down an answer after a few lookups — could you rephrase the question or be more specific?";

export async function* orchestrateChat(
  messages: Pick<ChatMessage, "role" | "content">[],
  characterContext?: CharacterContext,
): AsyncGenerator<ChatStreamEvent> {
  const ai = getGeminiClient();
  const systemInstruction = await buildSystemInstruction(characterContext);
  const contents = toGeminiContents(messages);

  // Once a model has answered, later rounds stay with it: a function call's
  // `thoughtSignature` is issued by one model and replaying it to a different
  // one is rejected.
  let activeModel: string | null = null;

  // One budget for the whole exchange, not per round: a tool-calling answer
  // opens several streams, and budgeting each separately lets a slow question
  // stack those waits into a minutes-long spinner.
  const deadline = Date.now() + GEMINI_TOTAL_BUDGET_MS;

  for (let round = 0; round < CHAT_MAX_TOOL_ROUNDS; round++) {
    // Collect the raw parts (not just `chunk.functionCalls`) so each part's
    // `thoughtSignature` survives the round trip - newer Gemini models reject
    // a replayed function call that's missing the signature it was issued with.
    const callParts: Part[] = [];
    let emittedText = "";

    // Opening the stream is retried and can switch models, which is only safe
    // because an overloaded model rejects here - before a single token has been
    // streamed to the browser.
    let stream: ContentStream;
    try {
      const opened: { value: ContentStream; model: string } = await withModelFallback(
        activeModel ? [activeModel] : MODEL_CANDIDATES,
        (model, timeoutMs) => openStream(ai, model, contents, systemInstruction, timeoutMs),
        deadline - Date.now(),
      );
      stream = opened.value;
      activeModel = opened.model;
    } catch (error) {
      yield { type: "error", message: friendlyGeminiErrorMessage(error) };
      return;
    }

    try {
      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.functionCall) callParts.push(part);
        }
        if (chunk.text) {
          emittedText += chunk.text;
          yield { type: "token", value: chunk.text };
        }
      }
    } catch (error) {
      yield { type: "error", message: friendlyGeminiErrorMessage(error) };
      return;
    }

    if (callParts.length === 0) {
      if (!emittedText) yield { type: "token", value: FALLBACK_MESSAGE };
      yield { type: "done" };
      return;
    }

    contents.push({ role: "model", parts: callParts });

    const responseParts = [];
    for (const part of callParts) {
      const call = part.functionCall!;
      const name = call.name ?? "unknown";
      yield { type: "tool_call", name };
      const result = await runFunctionCall(call);
      responseParts.push(createPartFromFunctionResponse(call.id ?? name, name, result));
    }
    contents.push({ role: "user", parts: responseParts });
  }

  yield { type: "token", value: FALLBACK_MESSAGE };
  yield { type: "done" };
}
