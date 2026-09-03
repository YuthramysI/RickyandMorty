/**
 * The Gemini SDK surfaces upstream failures as an Error whose message is
 * often the raw provider JSON payload - not something to show a user
 * directly. This maps the common cases to a short, friendly sentence.
 */
export function friendlyGeminiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429") || raw.includes("quota")) {
    return "The AI assistant has hit its usage limit for now. Please try again in a little while.";
  }
  if (raw.includes("UNAVAILABLE") || raw.includes("503")) {
    return "The AI assistant is temporarily overloaded on Google's end. Please try again in a moment.";
  }
  return "The AI assistant ran into a problem answering that. Please try again.";
}
