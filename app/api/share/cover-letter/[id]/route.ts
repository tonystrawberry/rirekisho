import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  buildCoverLetterShareSnapshot,
  coverLetterShareDataJson,
} from "@/lib/cover-letter/share-snapshot";
import {
  requestOrigin,
  sharedCoverLetterLinkToResponse,
} from "@/lib/share/serialize";

type Params = { params: Promise<{ id: string }> };

async function getOwnedCoverLetterLink(userId: string, id: string) {
  const row = await prisma.sharedCoverLetterLink.findFirst({
    where: { id, coverLetter: { application: { userId } } },
    include: {
      coverLetter: {
        select: {
          id: true,
          applicationId: true,
          application: { select: { title: true, companyName: true } },
        },
      },
    },
  });
  if (!row) return null;
  const { coverLetter, ...link } = row;
  return { coverLetter, link };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const owned = await getOwnedCoverLetterLink(session.user.id, id);
  if (!owned) return notFound("Share link not found");

  const body = (await req.json().catch(() => ({}))) as {
    action?: "revoke" | "refresh" | "reactivate";
    label?: string | null;
  };

  if (!body.action && body.label === undefined) {
    return badRequest("action or label is required");
  }

  let link = owned.link;

  if (body.action === "revoke") {
    link = await prisma.sharedCoverLetterLink.update({
      where: { id: link.id },
      data: { status: "revoked", revokedAt: new Date() },
    });
  } else if (body.action === "reactivate") {
    link = await prisma.sharedCoverLetterLink.update({
      where: { id: link.id },
      data: { status: "active", revokedAt: null },
    });
  } else if (body.action === "refresh") {
    const built = await buildCoverLetterShareSnapshot({
      userId: session.user.id,
      applicationId: owned.coverLetter.applicationId,
      locale: link.locale,
    });
    if (!built) return notFound("Application not found");

    link = await prisma.sharedCoverLetterLink.update({
      where: { id: link.id },
      data: {
        data: coverLetterShareDataJson(built.snapshot),
        sourceVersion: built.sourceVersion,
        templateId: built.snapshot.templateId,
        primaryColor: built.snapshot.primaryColor,
        locale: built.snapshot.locale,
        status: "active",
        revokedAt: null,
      },
    });
  }

  if (body.label !== undefined) {
    link = await prisma.sharedCoverLetterLink.update({
      where: { id: link.id },
      data: { label: body.label?.trim() || null },
    });
  }

  return NextResponse.json({
    link: {
      ...sharedCoverLetterLinkToResponse(link, requestOrigin(req)),
      applicationId: owned.coverLetter.applicationId,
      applicationTitle: owned.coverLetter.application.title,
      companyName: owned.coverLetter.application.companyName,
      coverLetterId: owned.coverLetter.id,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const owned = await getOwnedCoverLetterLink(session.user.id, id);
  if (!owned) return notFound("Share link not found");

  await prisma.sharedCoverLetterLink.delete({ where: { id: owned.link.id } });
  return NextResponse.json({ ok: true });
}
