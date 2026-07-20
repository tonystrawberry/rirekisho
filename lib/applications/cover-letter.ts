import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ApplicationContext = {
  applicationId: string;
  title: string;
  description: string | null;
  companyName: string | null;
  jobUrl: string | null;
  linkedResume: {
    id: string;
    title: string;
    data: unknown;
  } | null;
};

export async function getOwnedApplication(
  userId: string,
  applicationId: string,
) {
  return prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
    include: {
      linkedResume: { select: { id: true, title: true, data: true } },
      coverLetter: {
        include: { conversation: true },
      },
    },
  });
}

export async function getOrCreateCoverLetter(
  userId: string,
  applicationId: string,
) {
  const application = await getOwnedApplication(userId, applicationId);
  if (!application) return null;

  if (application.coverLetter) {
    let conversation = application.coverLetter.conversation;
    if (!conversation) {
      conversation = await prisma.coverLetterConversation.create({
        data: { coverLetterId: application.coverLetter.id, messages: [] },
      });
    }
    return {
      application,
      coverLetter: application.coverLetter,
      conversation,
    };
  }

  const coverLetter = await prisma.coverLetter.create({
    data: {
      applicationId: application.id,
      content: "",
      conversation: { create: { messages: [] } },
    },
    include: { conversation: true },
  });

  return {
    application,
    coverLetter,
    conversation: coverLetter.conversation!,
  };
}

export async function updateCoverLetterContent(
  coverLetterId: string,
  content: string,
) {
  const current = await prisma.coverLetter.findUniqueOrThrow({
    where: { id: coverLetterId },
    select: { contentVersion: true },
  });
  return prisma.coverLetter.update({
    where: { id: coverLetterId },
    data: {
      content,
      contentVersion: current.contentVersion + 1,
    },
  });
}

export async function updateCoverLetter(
  coverLetterId: string,
  data: {
    content?: string;
    templateId?: string;
    primaryColor?: string;
    identity?: Prisma.InputJsonValue;
    recipientName?: string | null;
    recipientTitle?: string | null;
    recipientEmail?: string | null;
    recipientOrganization?: string | null;
    recipientAddress?: string | null;
  },
) {
  return prisma.coverLetter.update({
    where: { id: coverLetterId },
    data: {
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
      ...(data.primaryColor !== undefined
        ? { primaryColor: data.primaryColor }
        : {}),
      ...(data.identity !== undefined ? { identity: data.identity } : {}),
      ...(data.recipientName !== undefined
        ? { recipientName: data.recipientName }
        : {}),
      ...(data.recipientTitle !== undefined
        ? { recipientTitle: data.recipientTitle }
        : {}),
      ...(data.recipientEmail !== undefined
        ? { recipientEmail: data.recipientEmail }
        : {}),
      ...(data.recipientOrganization !== undefined
        ? { recipientOrganization: data.recipientOrganization }
        : {}),
      ...(data.recipientAddress !== undefined
        ? { recipientAddress: data.recipientAddress }
        : {}),
    },
  });
}

export async function saveCoverLetterMessages(
  conversationId: string,
  messages: unknown[],
) {
  return prisma.coverLetterConversation.update({
    where: { id: conversationId },
    data: {
      messages: messages as Prisma.InputJsonValue,
    },
  });
}

export function buildApplicationContext(
  application: NonNullable<Awaited<ReturnType<typeof getOwnedApplication>>>,
): ApplicationContext {
  return {
    applicationId: application.id,
    title: application.title,
    description: application.description,
    companyName: application.companyName,
    jobUrl: application.jobUrl,
    linkedResume: application.linkedResume
      ? {
          id: application.linkedResume.id,
          title: application.linkedResume.title,
          data: application.linkedResume.data,
        }
      : null,
  };
}
