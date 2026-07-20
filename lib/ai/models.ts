import { google } from "@ai-sdk/google";

/** Default Gemini model for AI SDK 4 + @ai-sdk/google@1.x. Override with GEMINI_MODEL. */
export function getChatModel() {
  // gemini-2.0-flash often hits free-tier quota=0 for new keys; flash-latest is more reliable
  return google(process.env.GEMINI_MODEL || "gemini-flash-latest");
}

export function hasLlmKey() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** Shown in chat UIs / API when GOOGLE_GENERATIVE_AI_API_KEY is missing. */
export const AI_UNAVAILABLE_MESSAGE =
  "Chat and AI features are unavailable. Set GOOGLE_GENERATIVE_AI_API_KEY in your environment to enable them.";

/** Minimal AI SDK data-stream response with a single assistant text chunk. */
export function aiUnavailableStreamResponse(message = AI_UNAVAILABLE_MESSAGE) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`0:${JSON.stringify(message)}\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
