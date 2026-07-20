import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import {
  buildCoverLetterShareSnapshot,
  coverLetterShareDataJson,
} from "@/lib/cover-letter/share-snapshot";
import {
  publicCoverLetterSharePath,
  publicCoverLetterShareUrl,
} from "@/lib/cover-letter/share";
import { isResumeLocale } from "@/lib/resume/locales";
import { createShareToken } from "@/lib/share/tokens";
import { requestOrigin } from "@/lib/share/serialize";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    locale?: string;
    label?: string;
  };

  if (body.locale && !isResumeLocale(body.locale)) {
    return badRequest("Invalid locale");
  }

  const built = await buildCoverLetterShareSnapshot({
    userId: session.user.id,
    applicationId,
    locale: body.locale,
  });
  if (!built) {
    return notFound("Application not found");
  }

  const token = createShareToken();
  const link = await prisma.sharedCoverLetterLink.create({
    data: {
      coverLetterId: built.coverLetterId,
      token,
      locale: built.snapshot.locale,
      templateId: built.snapshot.templateId,
      primaryColor: built.snapshot.primaryColor,
      data: coverLetterShareDataJson(built.snapshot),
      sourceVersion: built.sourceVersion,
      label: body.label?.trim() || null,
      status: "active",
    },
  });

  const origin = requestOrigin(req);
  return NextResponse.json(
    {
      link: {
        id: link.id,
        token: link.token,
        locale: link.locale,
        templateId: link.templateId,
        primaryColor: link.primaryColor,
        sourceVersion: link.sourceVersion,
        status: link.status,
        label: link.label,
        viewCount: link.viewCount,
        createdAt: link.createdAt.toISOString(),
        path: publicCoverLetterSharePath(link.token),
        url: publicCoverLetterShareUrl(link.token, origin),
      },
    },
    { status: 201 },
  );
}
