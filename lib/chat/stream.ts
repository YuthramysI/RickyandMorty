import type { ChatStreamEvent } from "@/types/chat";

/**
 * Turns an async generator of chat events into a newline-delimited JSON
 * stream. Plain fetch + ReadableStream is used instead of EventSource/SSE
 * since the chat endpoint is a POST request.
 */
export function streamToResponse(events: AsyncGenerator<ChatStreamEvent>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        if (value.type === "done" || value.type === "error") {
          controller.close();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error.";
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message })}\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
