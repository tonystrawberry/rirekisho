import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import { coverLetterApplySuggestionSchema } from "@/lib/applications/cover-letter-schema";
import {
  getOrCreateCoverLetter,
  saveCoverLetterMessages,
} from "@/lib/applications/cover-letter";
import {
  applyCoverLetterPatch,
  clearLatestSuggestionFromMessages,
} from "@/lib/ai/cover-letter-chat";
import {
  getOrCreateCoverLetterPresentation,
  saveCoverLetterLocaleEdit,
} from "@/lib/cover-letter/presentations";
import { isResumeLocale } from "@/lib/resume/locales";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

type StoredMessage = { id?: string; role: string; content: string };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const parsed = coverLetterApplySuggestionSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return badRequest(
      "Invalid suggestion payload",
      parsed.error.flatten(),
    );
  }

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const locale = isResumeLocale(result.coverLetter.selectedLocale)
    ? result.coverLetter.selectedLocale
    : result.coverLetter.sourceLocale;

  const localized = await getOrCreateCoverLetterPresentation({
    coverLetterId: result.coverLetter.id,
    sourceLocale: result.coverLetter.sourceLocale,
    sourceVersion: result.coverLetter.contentVersion,
    sourceSubject: result.coverLetter.subject,
    sourceContent: result.coverLetter.content,
    locale,
  });

  let nextContent: string;
  if (parsed.data.mode === "full") {
    nextContent = parsed.data.content;
  } else {
    const patched = applyCoverLetterPatch(
      localized.content,
      parsed.data.find,
      parsed.data.replace,
    );
    if (patched === null) {
      return badRequest(
        "Could not find the text to replace in the current letter. Reject and ask for a new suggestion.",
      );
    }
    nextContent = patched;
  }

  await saveCoverLetterLocaleEdit({
    coverLetterId: result.coverLetter.id,
    locale,
    sourceLocale: result.coverLetter.sourceLocale,
    sourceVersion: result.coverLetter.contentVersion,
    content: nextContent,
  });

  const messages = Array.isArray(result.conversation.messages)
    ? (result.conversation.messages as StoredMessage[])
    : [];
  await saveCoverLetterMessages(
    result.conversation.id,
    clearLatestSuggestionFromMessages(messages),
  );

  const updated = await prisma.coverLetter.findUniqueOrThrow({
    where: { id: result.coverLetter.id },
  });

  return NextResponse.json({
    coverLetter: {
      id: updated.id,
      content: nextContent,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
