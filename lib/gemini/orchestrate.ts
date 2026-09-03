import {
  createModelContent,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/genai";
import { getGeminiClient } from "./client";
import { toolDeclarations, toolHandlers } from "./tools";
import { buildSystemInstruction } from "./systemPrompt";
import { friendlyGeminiErrorMessage } from "./errors";
import { CHAT_MAX_TOOL_ROUNDS, GEMINI_MODEL } from "@/lib/constants";
import type { CharacterContext, ChatMessage, ChatStreamEvent } from "@/types/chat";

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

const FALLBACK_MESSAGE =
  "I wasn't able to pin down an answer after a few lookups — could you rephrase the question or be more specific?";

export async function* orchestrateChat(
  messages: Pick<ChatMessage, "role" | "content">[],
  characterContext?: CharacterContext,
): AsyncGenerator<ChatStreamEvent> {
  const ai = getGeminiClient();
  const systemInstruction = await buildSystemInstruction(characterContext);
  const contents = toGeminiContents(messages);

  for (let round = 0; round < CHAT_MAX_TOOL_ROUNDS; round++) {
    // Collect the raw parts (not just `chunk.functionCalls`) so each part's
    // `thoughtSignature` survives the round trip - newer Gemini models reject
    // a replayed function call that's missing the signature it was issued with.
    const callParts: Part[] = [];
    let emittedText = "";

    try {
      const stream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction, tools: [{ functionDeclarations: toolDeclarations }] },
      });

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
