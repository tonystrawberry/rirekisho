import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import { getOrCreateCoverLetter } from "@/lib/applications/cover-letter";
import { resolveCoverLetterIdentity } from "@/lib/cover-letter/identity";
import { getOrCreateCoverLetterPresentation } from "@/lib/cover-letter/presentations";
import { renderCoverLetterDocx } from "@/lib/docx/cover-letter";
import { isResumeLocale } from "@/lib/resume/locales";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = (await req.json().catch(() => ({}))) as { locale?: string };

  const result = await getOrCreateCoverLetter(session.user.id, applicationId);
  if (!result) return notFound("Application not found");

  const { coverLetter, application } = result;
  const locale = body.locale || coverLetter.selectedLocale || coverLetter.sourceLocale;
  if (!isResumeLocale(locale)) return badRequest("Invalid locale");

  const presentation = await getOrCreateCoverLetterPresentation({
    coverLetterId: coverLetter.id,
    sourceLocale: coverLetter.sourceLocale,
    sourceVersion: coverLetter.contentVersion,
    sourceSubject: coverLetter.subject,
    sourceContent: coverLetter.content,
    locale,
  });

  const identity = resolveCoverLetterIdentity(
    coverLetter.identity,
    application.linkedResume?.data,
  );
  const buffer = await renderCoverLetterDocx({
    content: presentation.content,
    subject: presentation.subject,
    identity,
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
      subject: presentation.subject,
    },
    locale,
  });

  const safeName = (identity.fullName || "cover-letter")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName || "cover-letter"}-${locale}.docx"`,
    },
  });
}
