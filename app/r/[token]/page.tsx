import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { masterResumeSchema } from "@/lib/resume/schema";
import { isTemplateId, type TemplateId } from "@/lib/resume/templates";
import { localeLanguageName } from "@/lib/resume/locales";
import { PublicResumeView } from "@/components/share/public-resume-view";

type Props = { params: Promise<{ token: string }> };

export default async function PublicSharedResumePage({ params }: Props) {
  const { token } = await params;
  const link = await prisma.sharedResumeLink.findUnique({
    where: { token },
  });

  if (!link || link.status !== "active") notFound();

  // Count HTML views (best-effort)
  void prisma.sharedResumeLink
    .update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined);

  const data = masterResumeSchema.parse(link.data);
  const templateId = isTemplateId(link.templateId)
    ? (link.templateId as TemplateId)
    : "classic";

  return (
    <PublicResumeView
      data={data}
      templateId={templateId}
      locale={link.locale}
      primaryColor={link.primaryColor}
      languageLabel={localeLanguageName(link.locale)}
      label={link.label}
    />
  );
}
