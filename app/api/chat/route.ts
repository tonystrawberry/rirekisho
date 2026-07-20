import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { badRequest, unauthorized, notFound } from "@/lib/api-error";
import { masterResumeSchema, type MasterResume } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";
import {
  buildEnrichmentSystemPrompt,
  type EnrichmentJobContext,
} from "@/lib/ai/enrich-chat";
import {
  aiUnavailableStreamResponse,
  getChatModel,
  hasLlmKey,
} from "@/lib/ai/models";
import {
  getOrCreateConversation,
  saveConversationMessages,
} from "@/lib/ai/conversation";
import { getOwnedProfile } from "@/lib/etl/persist";
import { ensureJobPostingParsed } from "@/lib/applications/job-posting";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json();
  const profileId = body.profileId as string | undefined;
  if (!profileId) return badRequest("profileId is required");
  const applicationId =
    typeof body.applicationId === "string" && body.applicationId.trim()
      ? body.applicationId.trim()
      : null;

  const messages = (body.messages ?? []) as Array<{
    id?: string;
    role: string;
    content: string;
    parts?: unknown;
  }>;

  const profile = await getOwnedProfile(session.user.id, profileId);
  if (!profile) return notFound("Resume not found");

  let jobContext: EnrichmentJobContext | null = null;
  if (applicationId) {
    const application = await prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        companyName: true,
        jobUrl: true,
        jobPostingText: true,
        linkedResumeId: true,
      },
    });
    // Only inject when this chat is for the application's linked resume.
    if (application && application.linkedResumeId === profileId) {
      await ensureJobPostingParsed(application.id);
      const refreshed = await prisma.jobApplication.findUnique({
        where: { id: application.id },
        select: {
          title: true,
          description: true,
          companyName: true,
          jobUrl: true,
          jobPostingText: true,
        },
      });
      if (refreshed) {
        jobContext = {
          title: refreshed.title,
          companyName: refreshed.companyName,
          description: refreshed.description,
          jobUrl: refreshed.jobUrl,
          jobPostingText: refreshed.jobPostingText,
        };
      }
    }
  }

  const conversation = await getOrCreateConversation(profile.id);
  const data = masterResumeSchema.parse(profile.data) as MasterResume;
  const gaps = computeCompleteness(data).gaps;
  const system = buildEnrichmentSystemPrompt(data, gaps, jobContext);

  if (!hasLlmKey()) {
    return aiUnavailableStreamResponse();
  }

  const result = streamText({
    model: getChatModel(),
    system,
    messages: messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content:
          typeof m.content === "string" && m.content.length > 0
            ? m.content
            : Array.isArray(m.parts)
              ? (m.parts as Array<{ type?: string; text?: string }>)
                  .filter((p) => p.type === "text" && p.text)
                  .map((p) => p.text)
                  .join("")
              : "",
      }))
      .filter((m) => m.content.length > 0),
    async onFinish({ text }) {
      const nextMessages = messages.map((m, i) => ({
        id: m.id?.trim() ? m.id : `${conversation.id}-${m.role}-${i}`,
        role: m.role,
        content: m.content,
      }));
      nextMessages.push({
        id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: text,
      });
      await saveConversationMessages(conversation.id, nextMessages);
    },
  });

  return result.toDataStreamResponse({
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

/** Clear persisted resume chat history so the user can start fresh. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const profileId = new URL(req.url).searchParams.get("profileId")?.trim();
  if (!profileId) return badRequest("profileId is required");

  const profile = await getOwnedProfile(session.user.id, profileId);
  if (!profile) return notFound("Resume not found");

  const conversation = await getOrCreateConversation(profile.id);
  await saveConversationMessages(conversation.id, []);

  return Response.json({ id: conversation.id, messages: [] });
}
