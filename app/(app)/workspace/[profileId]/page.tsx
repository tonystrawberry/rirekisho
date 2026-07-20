import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getOwnedProfile } from "@/lib/etl/persist";
import { getOrCreateConversation } from "@/lib/ai/conversation";
import { masterResumeSchema } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";
import { bustResumeImageUrls } from "@/lib/resume/image-urls";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import { WorkspaceClient } from "@/app/(app)/workspace/workspace-client";
import type { TemplateId } from "@/lib/resume/templates";
import { isTemplateId } from "@/lib/resume/templates";
import { hasLlmKey } from "@/lib/ai/models";

type Props = { params: Promise<{ profileId: string }> };

export default async function WorkspacePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { profileId } = await params;
  const profile = await getOwnedProfile(session.user.id, profileId);
  if (!profile) notFound();

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

  return (
    <WorkspaceClient
      profileId={profile.id}
      resumeTitle={profile.title}
      chatId={conversation.id}
      initialMessages={messages}
      profileVersion={profile.version}
      initialCompleteness={completeness}
      initialData={data}
      initialTemplateId={templateId}
      initialPrimaryColor={primaryColor}
      initialLocale={profile.selectedLocale}
      sourceLocale={profile.sourceLocale}
      aiEnabled={hasLlmKey()}
    />
  );
}
