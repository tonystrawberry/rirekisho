import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  badRequest,
  notFound,
  unauthorized,
  upstreamError,
} from "@/lib/api-error";
import { getOrCreateCoverLetter } from "@/lib/applications/cover-letter";
import { getOrCreateCoverLetterPresentation } from "@/lib/cover-letter/presentations";
import { isResumeLocale } from "@/lib/resume/locales";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    locale?: string;
    force?: boolean;
  };
  if (!body.locale) return badRequest("locale is required");
  if (!isResumeLocale(body.locale)) {
    return badRequest(`Unsupported locale: ${body.locale}`);
  }

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  try {
    const presentation = await getOrCreateCoverLetterPresentation({
      coverLetterId: result.coverLetter.id,
      sourceLocale: result.coverLetter.sourceLocale,
      sourceVersion: result.coverLetter.contentVersion,
      sourceSubject: result.coverLetter.subject,
      sourceContent: result.coverLetter.content,
      locale: body.locale,
      force: body.force,
    });

    await prisma.coverLetter.update({
      where: { id: result.coverLetter.id },
      data: { selectedLocale: body.locale },
    });

    return NextResponse.json({
      locale: presentation.locale,
      sourceVersion: presentation.sourceVersion,
      cached: presentation.cached,
      subject: presentation.subject,
      content: presentation.content,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Translation failed";
    console.error("[cover-letter/translate]", message);
    return upstreamError(message);
  }
}
