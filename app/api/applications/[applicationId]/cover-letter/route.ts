import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import { coverLetterContentSchema } from "@/lib/applications/cover-letter-schema";
import {
  getOrCreateCoverLetter,
  updateCoverLetter,
} from "@/lib/applications/cover-letter";
import { resolveCoverLetterIdentity } from "@/lib/cover-letter/identity";
import {
  getOrCreateCoverLetterPresentation,
  saveCoverLetterLocaleEdit,
} from "@/lib/cover-letter/presentations";
import {
  isCoverLetterTemplateId,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import { isResumeLocale, type ResumeLocaleId } from "@/lib/resume/locales";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

async function resolveLocalized(
  coverLetter: {
    id: string;
    content: string;
    subject: string;
    sourceLocale: string;
    selectedLocale: string;
    contentVersion: number;
  },
  localeOverride?: string,
) {
  const locale: ResumeLocaleId = isResumeLocale(
    localeOverride ?? coverLetter.selectedLocale,
  )
    ? ((localeOverride ?? coverLetter.selectedLocale) as ResumeLocaleId)
    : "en";

  const presentation = await getOrCreateCoverLetterPresentation({
    coverLetterId: coverLetter.id,
    sourceLocale: coverLetter.sourceLocale,
    sourceVersion: coverLetter.contentVersion,
    sourceSubject: coverLetter.subject,
    sourceContent: coverLetter.content,
    locale,
  });

  return presentation;
}

function serializeMeta(
  coverLetter: {
    recipientName: string | null;
    recipientTitle: string | null;
    recipientEmail: string | null;
    recipientOrganization: string | null;
    recipientAddress: string | null;
  },
  application: {
    companyName: string | null;
    title: string;
    appliedAt: Date | null;
  },
) {
  return {
    companyName: application.companyName,
    jobTitle: application.title,
    letterDate: application.appliedAt?.toISOString() ?? null,
    recipientName: coverLetter.recipientName,
    recipientTitle: coverLetter.recipientTitle,
    recipientEmail: coverLetter.recipientEmail,
    recipientOrganization:
      coverLetter.recipientOrganization ?? application.companyName,
    recipientAddress: coverLetter.recipientAddress,
  };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const { coverLetter, conversation, application } = result;
  const localized = await resolveLocalized(coverLetter);
  const templateId: CoverLetterTemplateId = isCoverLetterTemplateId(
    coverLetter.templateId,
  )
    ? coverLetter.templateId
    : "classic";
  const primaryColor =
    normalizePrimaryColor(coverLetter.primaryColor) ?? DEFAULT_PRIMARY_COLOR;

  return NextResponse.json({
    coverLetter: {
      id: coverLetter.id,
      applicationId: coverLetter.applicationId,
      content: localized.content,
      subject: localized.subject,
      templateId,
      primaryColor,
      sourceLocale: coverLetter.sourceLocale,
      selectedLocale: localized.locale,
      contentVersion: coverLetter.contentVersion,
      recipientName: coverLetter.recipientName,
      recipientTitle: coverLetter.recipientTitle,
      recipientEmail: coverLetter.recipientEmail,
      recipientOrganization:
        coverLetter.recipientOrganization ?? application.companyName,
      recipientAddress: coverLetter.recipientAddress,
      createdAt: coverLetter.createdAt.toISOString(),
      updatedAt: coverLetter.updatedAt.toISOString(),
    },
    conversationId: conversation.id,
    identity: resolveCoverLetterIdentity(
      coverLetter.identity,
      application.linkedResume?.data,
    ),
    linkedResumeId: application.linkedResumeId,
    meta: serializeMeta(coverLetter, application),
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const parsed = coverLetterContentSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return badRequest("Invalid cover letter payload", parsed.error.flatten());
  }

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const data = parsed.data;
  let coverLetter = {
    ...result.coverLetter,
  };

  // Non-text settings always update the root cover letter
  if (
    data.templateId !== undefined ||
    data.primaryColor !== undefined ||
    data.identity !== undefined ||
    data.recipientName !== undefined ||
    data.recipientTitle !== undefined ||
    data.recipientEmail !== undefined ||
    data.recipientOrganization !== undefined ||
    data.recipientAddress !== undefined
  ) {
    const updated = await updateCoverLetter(coverLetter.id, {
      templateId: data.templateId,
      primaryColor: data.primaryColor,
      identity: data.identity,
      recipientName: data.recipientName,
      recipientTitle: data.recipientTitle,
      recipientEmail: data.recipientEmail,
      recipientOrganization: data.recipientOrganization,
      recipientAddress: data.recipientAddress,
    });
    coverLetter = { ...coverLetter, ...updated };
  }

  const editLocale: ResumeLocaleId = isResumeLocale(
    data.locale ?? coverLetter.selectedLocale,
  )
    ? ((data.locale ?? coverLetter.selectedLocale) as ResumeLocaleId)
    : "en";

  if (data.content !== undefined || data.subject !== undefined) {
    await saveCoverLetterLocaleEdit({
      coverLetterId: coverLetter.id,
      locale: editLocale,
      sourceLocale: coverLetter.sourceLocale,
      sourceVersion: coverLetter.contentVersion,
      subject: data.subject,
      content: data.content,
    });
    const refreshed = await prisma.coverLetter.findUniqueOrThrow({
      where: { id: coverLetter.id },
    });
    coverLetter = { ...coverLetter, ...refreshed };
  }

  if (data.locale !== undefined && isResumeLocale(data.locale)) {
    const updated = await prisma.coverLetter.update({
      where: { id: coverLetter.id },
      data: { selectedLocale: data.locale },
    });
    coverLetter = { ...coverLetter, ...updated };
  }

  const localized = await resolveLocalized(coverLetter, editLocale);
  const templateId: CoverLetterTemplateId = isCoverLetterTemplateId(
    coverLetter.templateId,
  )
    ? coverLetter.templateId
    : "classic";
  const primaryColor =
    normalizePrimaryColor(coverLetter.primaryColor) ?? DEFAULT_PRIMARY_COLOR;

  return NextResponse.json({
    coverLetter: {
      id: coverLetter.id,
      content: localized.content,
      subject: localized.subject,
      templateId,
      primaryColor,
      sourceLocale: coverLetter.sourceLocale,
      selectedLocale: localized.locale,
      contentVersion: coverLetter.contentVersion,
      recipientName: coverLetter.recipientName,
      recipientTitle: coverLetter.recipientTitle,
      recipientEmail: coverLetter.recipientEmail,
      recipientOrganization:
        coverLetter.recipientOrganization ?? result.application.companyName,
      recipientAddress: coverLetter.recipientAddress,
      updatedAt: coverLetter.updatedAt.toISOString(),
    },
    identity: resolveCoverLetterIdentity(
      coverLetter.identity,
      result.application.linkedResume?.data,
    ),
    meta: serializeMeta(coverLetter, result.application),
  });
}
