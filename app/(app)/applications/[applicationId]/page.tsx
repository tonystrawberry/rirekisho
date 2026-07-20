import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOwnedProfile } from "@/lib/etl/persist";
import { getOrCreateConversation } from "@/lib/ai/conversation";
import { masterResumeSchema } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";
import { bustResumeImageUrls } from "@/lib/resume/image-urls";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import type { TemplateId } from "@/lib/resume/templates";
import { isTemplateId } from "@/lib/resume/templates";
import type { CompletenessResult } from "@/lib/resume/completeness";
import type { MasterResume } from "@/lib/resume/schema";
import {
  identityToPersonalInput,
  resolveApplicationIdentity,
} from "@/lib/applications/sync-identity";
import {
  ApplicationDetailClient,
  type ApplicationDetail,
  type DetailTab,
  type LinkedResumeWorkspace,
} from "./application-detail-client";

type PageProps = {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): DetailTab {
  if (value === "cover-letter") return "cover-letter";
  if (value === "resume") return "resume";
  return "information";
}

async function loadLinkedResumeWorkspace(
  userId: string,
  profileId: string,
): Promise<LinkedResumeWorkspace | null> {
  const profile = await getOwnedProfile(userId, profileId);
  if (!profile) return null;

  const conversation = await getOrCreateConversation(profile.id);
  const parsed = masterResumeSchema.parse(profile.data);
  const completeness = computeCompleteness(parsed);
  const data = bustResumeImageUrls(parsed, profile.version);

  const rawMessages = Array.isArray(conversation.messages)
    ? (conversation.messages as Array<{
        id?: string;
        role: string;
        content: string;
      }>)
    : [];
  const messages = rawMessages.map((m, i) => ({
    id: m.id?.trim() ? m.id : `${conversation.id}-${m.role}-${i}`,
    role: m.role,
    content: m.content,
  }));

  const templateId: TemplateId = isTemplateId(profile.selectedTemplateId)
    ? profile.selectedTemplateId
    : "classic";
  const primaryColor =
    normalizePrimaryColor(profile.primaryColor) ?? DEFAULT_PRIMARY_COLOR;

  return {
    profileId: profile.id,
    resumeTitle: profile.title,
    chatId: conversation.id,
    initialMessages: messages,
    profileVersion: profile.version,
    initialCompleteness: completeness as CompletenessResult,
    initialData: data as MasterResume,
    initialTemplateId: templateId,
    initialPrimaryColor: primaryColor,
    initialLocale: profile.selectedLocale,
    sourceLocale: profile.sourceLocale,
  };
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { applicationId } = await params;
  const { tab: tabParam } = await searchParams;
  const activeTab = parseTab(tabParam);

  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId: session.user.id },
    include: {
      linkedResume: { select: { id: true, title: true, data: true } },
      coverLetter: { select: { identity: true } },
    },
  });

  if (!app) notFound();

  const application: ApplicationDetail = {
    id: app.id,
    title: app.title,
    description: app.description,
    companyName: app.companyName,
    jobUrl: app.jobUrl,
    status: app.status,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    linkedResumeId: app.linkedResumeId,
    linkedResumeTitle: app.linkedResume?.title ?? null,
    updatedAt: app.updatedAt.toISOString(),
  };

  const linkedResumeWorkspace =
    app.linkedResumeId && app.linkedResume
      ? await loadLinkedResumeWorkspace(session.user.id, app.linkedResumeId)
      : null;

  const initialIdentity = resolveApplicationIdentity({
    coverLetterIdentity: app.coverLetter?.identity,
    linkedResumeData: app.linkedResume?.data,
  });

  return (
    <ApplicationDetailClient
      application={application}
      initialTab={activeTab}
      linkedResumeWorkspace={linkedResumeWorkspace}
      initialPersonal={identityToPersonalInput(initialIdentity)}
    />
  );
}
