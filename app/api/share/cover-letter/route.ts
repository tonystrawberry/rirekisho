import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  requestOrigin,
  sharedCoverLetterLinkToResponse,
} from "@/lib/share/serialize";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const links = await prisma.sharedCoverLetterLink.findMany({
    where: { coverLetter: { application: { userId: session.user.id } } },
    orderBy: { createdAt: "desc" },
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

  const origin = requestOrigin(req);
  return NextResponse.json({
    links: links.map((l) => ({
      ...sharedCoverLetterLinkToResponse(l, origin),
      applicationId: l.coverLetter.applicationId,
      applicationTitle: l.coverLetter.application.title,
      companyName: l.coverLetter.application.companyName,
      coverLetterId: l.coverLetter.id,
    })),
  });
}
