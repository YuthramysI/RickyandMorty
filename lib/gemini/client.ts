import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

/** Lazily constructed so the app can boot (and lint/build) without the env var set. */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Add it to your .env.local file.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
