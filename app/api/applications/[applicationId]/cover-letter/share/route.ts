import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import { getOrCreateCoverLetter } from "@/lib/applications/cover-letter";
import { parseCoverLetterIdentity } from "@/lib/cover-letter/identity";
import { getOrCreateCoverLetterPresentation } from "@/lib/cover-letter/presentations";
import {
  isCoverLetterTemplateId,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import {
  publicCoverLetterSharePath,
  publicCoverLetterShareUrl,
  type CoverLetterShareSnapshot,
} from "@/lib/cover-letter/share";
import { isResumeLocale } from "@/lib/resume/locales";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import { createShareToken } from "@/lib/share/tokens";
import { requestOrigin } from "@/lib/share/serialize";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    locale?: string;
    label?: string;
  };

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const coverLetter = result.coverLetter;
  const locale = body.locale || coverLetter.selectedLocale || coverLetter.sourceLocale;
  if (!isResumeLocale(locale)) return badRequest("Invalid locale");

  const templateId: CoverLetterTemplateId = isCoverLetterTemplateId(
    coverLetter.templateId,
  )
    ? coverLetter.templateId
    : "classic";
  const primaryColor =
    normalizePrimaryColor(coverLetter.primaryColor) ?? DEFAULT_PRIMARY_COLOR;

  const presentation = await getOrCreateCoverLetterPresentation({
    coverLetterId: coverLetter.id,
    sourceLocale: coverLetter.sourceLocale,
    sourceVersion: coverLetter.contentVersion,
    sourceSubject: coverLetter.subject,
    sourceContent: coverLetter.content,
    locale,
  });

  const snapshot: CoverLetterShareSnapshot = {
    content: presentation.content,
    subject: presentation.subject,
    templateId,
    primaryColor,
    locale,
    identity: parseCoverLetterIdentity(result.application.linkedResume?.data),
    meta: {
      companyName: result.application.companyName,
      jobTitle: result.application.title,
      letterDate: result.application.appliedAt?.toISOString() ?? null,
      recipientName: coverLetter.recipientName,
      recipientTitle: coverLetter.recipientTitle,
      recipientEmail: coverLetter.recipientEmail,
      recipientOrganization:
        coverLetter.recipientOrganization ?? result.application.companyName,
      recipientAddress: coverLetter.recipientAddress,
    },
  };

  const token = createShareToken();
  const link = await prisma.sharedCoverLetterLink.create({
    data: {
      coverLetterId: coverLetter.id,
      token,
      locale,
      templateId,
      primaryColor,
      data: snapshot as unknown as Prisma.InputJsonValue,
      sourceVersion: presentation.sourceVersion,
      label: body.label?.trim() || null,
      status: "active",
    },
  });

  const origin = requestOrigin(req);
  return NextResponse.json(
    {
      link: {
        id: link.id,
        token: link.token,
        locale: link.locale,
        templateId: link.templateId,
        primaryColor: link.primaryColor,
        sourceVersion: link.sourceVersion,
        status: link.status,
        label: link.label,
        viewCount: link.viewCount,
        createdAt: link.createdAt.toISOString(),
        path: publicCoverLetterSharePath(link.token),
        url: publicCoverLetterShareUrl(link.token, origin),
      },
    },
    { status: 201 },
  );
}
