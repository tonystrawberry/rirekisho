import { NextResponse } from "next/server";
import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import {
  buildApplicationContext,
  getOrCreateCoverLetter,
  saveCoverLetterMessages,
} from "@/lib/applications/cover-letter";
import {
  buildCoverLetterSystemPrompt,
  clearLatestSuggestionFromMessages,
  offlineCoverLetterReply,
} from "@/lib/ai/cover-letter-chat";
import { getChatModel, hasLlmKey } from "@/lib/ai/models";

type Params = { params: Promise<{ applicationId: string }> };

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  parts?: unknown;
};

function normalizeMessages(messages: ChatMessage[], conversationId: string) {
  return messages.map((m, i) => ({
    id: m.id?.trim() ? m.id : `${conversationId}-${m.role}-${i}`,
    role: m.role,
    content:
      typeof m.content === "string" && m.content.length > 0
        ? m.content
        : Array.isArray(m.parts)
          ? (m.parts as Array<{ type?: string; text?: string }>)
              .filter((p) => p.type === "text" && p.text)
              .map((p) => p.text)
              .join("")
          : "",
  }));
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const messages = Array.isArray(result.conversation.messages)
    ? result.conversation.messages
    : [];

  return NextResponse.json({
    id: result.conversation.id,
    messages,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = await req.json().catch(() => ({}));
  const messages = (body.messages ?? []) as ChatMessage[];
  if (!Array.isArray(messages)) {
    return badRequest("messages must be an array");
  }
  const currentBody =
    typeof body.currentContent === "string" ? body.currentContent : "";

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const ctx = buildApplicationContext(result.application);
  const system = buildCoverLetterSystemPrompt(ctx, currentBody);
  const conversationId = result.conversation.id;

  if (!hasLlmKey()) {
    const reply = offlineCoverLetterReply(ctx, currentBody);
    const nextMessages = [
      ...normalizeMessages(messages, conversationId),
      {
        id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: reply,
      },
    ];
    await saveCoverLetterMessages(conversationId, nextMessages);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(reply)}\n`));
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

  const resultStream = streamText({
    model: getChatModel(),
    system,
    messages: normalizeMessages(messages, conversationId)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
      .filter((m) => m.content.length > 0),
    async onFinish({ text }) {
      const nextMessages = normalizeMessages(messages, conversationId);
      nextMessages.push({
        id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: text,
      });
      await saveCoverLetterMessages(conversationId, nextMessages);
    },
  });

  return resultStream.toDataStreamResponse({
    getErrorMessage: (error) => {
      if (error == null) return "Unknown model error";
      if (typeof error === "string") return error;
      if (error instanceof Error) {
        if (/quota|rate.?limit/i.test(error.message)) {
          return "Gemini quota exceeded. Check your Google AI Studio plan/billing, wait for the reset, or set GEMINI_MODEL to another available model.";
        }
        return error.message;
      }
      return "Model request failed";
    },
  });
}

/** Persist Reject / clear pending suggestion fences from the last assistant reply. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "dismiss-suggestion") {
    return badRequest("Unsupported action");
  }

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const messages = Array.isArray(result.conversation.messages)
    ? (result.conversation.messages as ChatMessage[])
    : [];
  const nextMessages = clearLatestSuggestionFromMessages(
    normalizeMessages(messages, result.conversation.id),
  );
  await saveCoverLetterMessages(result.conversation.id, nextMessages);

  return NextResponse.json({ id: result.conversation.id, messages: nextMessages });
}
