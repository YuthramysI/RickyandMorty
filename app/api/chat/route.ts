import { NextResponse } from "next/server";
import { checkClientRateLimit, getClientIdentity } from "@/lib/chat/rateLimit";
import { chatRequestSchema } from "@/lib/chat/validation";
import { streamToResponse } from "@/lib/chat/stream";
import { orchestrateChat } from "@/lib/gemini/orchestrate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkClientRateLimit(getClientIdentity(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rateLimit.retryAfterMs / 1000).toString() },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue ? `Invalid request: ${firstIssue.message}.` : "Invalid request.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "The chat assistant is not configured on this server." },
      { status: 503 },
    );
  }

  const { messages, characterContext } = parsed.data;
  const events = orchestrateChat(messages, characterContext);
  return streamToResponse(events);
}
