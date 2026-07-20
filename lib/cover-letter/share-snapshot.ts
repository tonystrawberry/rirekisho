import type { Prisma } from "@prisma/client";
import { getOrCreateCoverLetter } from "@/lib/applications/cover-letter";
import { resolveCoverLetterIdentity } from "@/lib/cover-letter/identity";
import { getOrCreateCoverLetterPresentation } from "@/lib/cover-letter/presentations";
import {
  isCoverLetterTemplateId,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import type { CoverLetterShareSnapshot } from "@/lib/cover-letter/share";
import { isResumeLocale } from "@/lib/resume/locales";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";

export async function buildCoverLetterShareSnapshot(opts: {
  userId: string;
  applicationId: string;
  locale?: string;
}): Promise<{
  coverLetterId: string;
  applicationTitle: string;
  companyName: string | null;
  snapshot: CoverLetterShareSnapshot;
  sourceVersion: number;
} | null> {
  const result = await getOrCreateCoverLetter(opts.userId, opts.applicationId);
  if (!result) return null;

  const { coverLetter, application } = result;
  const locale =
    opts.locale || coverLetter.selectedLocale || coverLetter.sourceLocale;
  if (!isResumeLocale(locale)) return null;

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
    identity: resolveCoverLetterIdentity(
      coverLetter.identity,
      application.linkedResume?.data,
    ),
    meta: {
      companyName: application.companyName,
      jobTitle: application.title,
      letterDate: application.appliedAt?.toISOString() ?? null,
      recipientName: coverLetter.recipientName,
      recipientTitle: coverLetter.recipientTitle,
      recipientEmail: coverLetter.recipientEmail,
      recipientOrganization:
        coverLetter.recipientOrganization ?? application.companyName,
      recipientAddress: coverLetter.recipientAddress,
    },
  };

  return {
    coverLetterId: coverLetter.id,
    applicationTitle: application.title,
    companyName: application.companyName,
    snapshot,
    sourceVersion: presentation.sourceVersion,
  };
}

export function coverLetterShareDataJson(
  snapshot: CoverLetterShareSnapshot,
): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue;
}
