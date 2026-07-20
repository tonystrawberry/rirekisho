import { prisma } from "@/lib/db";
import {
  isResumeLocale,
  type ResumeLocaleId,
} from "@/lib/resume/locales";
import { translateCoverLetterText } from "@/lib/cover-letter/translate";

export async function getOrCreateCoverLetterPresentation(opts: {
  coverLetterId: string;
  sourceLocale: string;
  sourceVersion: number;
  sourceSubject: string;
  sourceContent: string;
  locale: string;
  force?: boolean;
}): Promise<{
  locale: ResumeLocaleId;
  subject: string;
  content: string;
  sourceVersion: number;
  cached: boolean;
}> {
  const locale: ResumeLocaleId = isResumeLocale(opts.locale)
    ? opts.locale
    : "en";

  if (locale === opts.sourceLocale) {
    return {
      locale,
      subject: opts.sourceSubject,
      content: opts.sourceContent,
      sourceVersion: opts.sourceVersion,
      cached: true,
    };
  }

  const existing = await prisma.coverLetterLocalePresentation.findUnique({
    where: {
      coverLetterId_locale: {
        coverLetterId: opts.coverLetterId,
        locale,
      },
    },
  });

  if (
    existing &&
    !opts.force &&
    existing.sourceVersion === opts.sourceVersion
  ) {
    return {
      locale,
      subject: existing.subject,
      content: existing.content,
      sourceVersion: existing.sourceVersion,
      cached: true,
    };
  }

  const translated = await translateCoverLetterText(
    { subject: opts.sourceSubject, content: opts.sourceContent },
    locale,
  );

  const saved = await prisma.coverLetterLocalePresentation.upsert({
    where: {
      coverLetterId_locale: {
        coverLetterId: opts.coverLetterId,
        locale,
      },
    },
    create: {
      coverLetterId: opts.coverLetterId,
      locale,
      subject: translated.subject,
      content: translated.content,
      sourceVersion: opts.sourceVersion,
    },
    update: {
      subject: translated.subject,
      content: translated.content,
      sourceVersion: opts.sourceVersion,
    },
  });

  return {
    locale,
    subject: saved.subject,
    content: saved.content,
    sourceVersion: saved.sourceVersion,
    cached: false,
  };
}

export async function saveCoverLetterLocaleEdit(opts: {
  coverLetterId: string;
  locale: string;
  sourceLocale: string;
  sourceVersion: number;
  subject?: string;
  content?: string;
}) {
  if (opts.locale === opts.sourceLocale) {
    const data: {
      subject?: string;
      content?: string;
      contentVersion?: number;
    } = {};
    if (opts.subject !== undefined) data.subject = opts.subject;
    if (opts.content !== undefined) data.content = opts.content;
    if (opts.subject !== undefined || opts.content !== undefined) {
      data.contentVersion = opts.sourceVersion + 1;
    }
    return prisma.coverLetter.update({
      where: { id: opts.coverLetterId },
      data,
    });
  }

  const existing = await prisma.coverLetterLocalePresentation.findUnique({
    where: {
      coverLetterId_locale: {
        coverLetterId: opts.coverLetterId,
        locale: opts.locale,
      },
    },
  });

  return prisma.coverLetterLocalePresentation.upsert({
    where: {
      coverLetterId_locale: {
        coverLetterId: opts.coverLetterId,
        locale: opts.locale,
      },
    },
    create: {
      coverLetterId: opts.coverLetterId,
      locale: opts.locale,
      subject: opts.subject ?? existing?.subject ?? "",
      content: opts.content ?? existing?.content ?? "",
      sourceVersion: opts.sourceVersion,
    },
    update: {
      ...(opts.subject !== undefined ? { subject: opts.subject } : {}),
      ...(opts.content !== undefined ? { content: opts.content } : {}),
    },
  });
}
