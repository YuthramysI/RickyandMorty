import {
  createModelContent,
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
  type FunctionCall,
} from "@google/genai";
import { getGeminiClient } from "./client";
import { toolDeclarations, toolHandlers } from "./tools";
import { buildSystemInstruction } from "./systemPrompt";
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
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction, tools: [{ functionDeclarations: toolDeclarations }] },
    });

    const pendingCalls: FunctionCall[] = [];
    let emittedText = "";
    let sawFunctionCall = false;

    for await (const chunk of stream) {
      const calls = chunk.functionCalls;
      if (calls && calls.length > 0) {
        sawFunctionCall = true;
        pendingCalls.push(...calls);
        continue;
      }
      if (chunk.text) {
        emittedText += chunk.text;
        yield { type: "token", value: chunk.text };
      }
    }

    if (!sawFunctionCall) {
      if (!emittedText) yield { type: "token", value: FALLBACK_MESSAGE };
      yield { type: "done" };
      return;
    }

    const callParts = pendingCalls.map((call) =>
      createPartFromFunctionCall(call.name ?? "", call.args ?? {}),
    );
    contents.push({ role: "model", parts: callParts });

    const responseParts = [];
    for (const call of pendingCalls) {
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
