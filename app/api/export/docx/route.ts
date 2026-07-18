import { auth } from "@/lib/auth";
import {
  badRequest,
  notFound,
  unauthorized,
  unprocessable,
} from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { ExportFormat } from "@prisma/client";
import { masterResumeSchema } from "@/lib/resume/schema";
import { hasCriticalGaps } from "@/lib/resume/completeness";
import { getOwnedProfile } from "@/lib/etl/persist";
import { renderClassicalDocx } from "@/lib/docx/classical";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    profileId?: string;
    locale?: string;
    acknowledgeIncomplete?: boolean;
  };

  if (!body.profileId) return badRequest("profileId is required");

  const profile = await getOwnedProfile(session.user.id, body.profileId);
  if (!profile) return notFound("Resume not found");

  const locale = body.locale || profile.selectedLocale;
  let data = masterResumeSchema.parse(profile.data);

  if (locale !== profile.sourceLocale) {
    const presentation = await prisma.localePresentation.findUnique({
      where: {
        profileId_locale: { profileId: profile.id, locale },
      },
    });
    if (presentation) {
      data = masterResumeSchema.parse(presentation.data);
    }
  }

  if (hasCriticalGaps(data) && !body.acknowledgeIncomplete) {
    return unprocessable(
      "Critical sections incomplete. Set acknowledgeIncomplete=true to export anyway.",
      { gaps: data.meta.gaps.filter((g) => g.severity === "critical") },
    );
  }

  const buffer = await renderClassicalDocx(data, locale);

  try {
    await prisma.exportArtifact.create({
      data: {
        profileId: profile.id,
        templateId: "classical",
        locale,
        format: ExportFormat.docx,
      },
    });
  } catch (err) {
    // Don't fail the download if telemetry/logging insert fails (e.g. stale
    // Prisma client in a long-lived next-dev process after an enum migration).
    console.warn("[export/docx] exportArtifact create skipped:", err);
  }

  const safeName = (data.identity.fullName || "resume")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName || "resume"}-${locale}.docx"`,
    },
  });
}
