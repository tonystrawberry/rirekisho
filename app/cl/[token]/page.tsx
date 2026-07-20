import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicCoverLetterView } from "@/components/share/public-cover-letter-view";
import {
  isCoverLetterTemplateId,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import type { CoverLetterShareSnapshot } from "@/lib/cover-letter/share";
import { DEFAULT_PRIMARY_COLOR, normalizePrimaryColor } from "@/lib/resume/theme-color";

type Props = { params: Promise<{ token: string }> };

function parseSnapshot(raw: unknown): CoverLetterShareSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const templateId = isCoverLetterTemplateId(String(data.templateId ?? ""))
    ? (data.templateId as CoverLetterTemplateId)
    : "classic";
  const primaryColor =
    normalizePrimaryColor(String(data.primaryColor ?? "")) ??
    DEFAULT_PRIMARY_COLOR;
  const identity =
    data.identity && typeof data.identity === "object"
      ? (data.identity as CoverLetterShareSnapshot["identity"])
      : { fullName: "Your Name" };
  const meta =
    data.meta && typeof data.meta === "object"
      ? (data.meta as CoverLetterShareSnapshot["meta"])
      : {};

  return {
    content: typeof data.content === "string" ? data.content : "",
    subject: typeof data.subject === "string" ? data.subject : "",
    templateId,
    primaryColor,
    locale: typeof data.locale === "string" ? data.locale : "en",
    identity,
    meta,
  };
}

export default async function PublicSharedCoverLetterPage({ params }: Props) {
  const { token } = await params;
  const link = await prisma.sharedCoverLetterLink.findUnique({
    where: { token },
  });

  if (!link || link.status !== "active") notFound();

  void prisma.sharedCoverLetterLink
    .update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined);

  const snapshot = parseSnapshot(link.data);
  if (!snapshot) notFound();

  return <PublicCoverLetterView snapshot={snapshot} label={link.label} />;
}
