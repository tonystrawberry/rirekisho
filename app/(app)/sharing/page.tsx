import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  sharedCoverLetterLinkToResponse,
  sharedLinkToResponse,
} from "@/lib/share/serialize";
import { SharingClient } from "./sharing-client";

export default async function SharingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [resumeLinks, coverLetterLinks] = await Promise.all([
    prisma.sharedResumeLink.findMany({
      where: { profile: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      include: { profile: { select: { id: true, title: true } } },
    }),
    prisma.sharedCoverLetterLink.findMany({
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
    }),
  ]);

  return (
    <SharingClient
      initialResumeLinks={resumeLinks.map((l) => ({
        ...sharedLinkToResponse(l),
        resumeTitle: l.profile.title,
        profileId: l.profile.id,
      }))}
      initialCoverLetterLinks={coverLetterLinks.map((l) => ({
        ...sharedCoverLetterLinkToResponse(l),
        applicationId: l.coverLetter.applicationId,
        applicationTitle: l.coverLetter.application.title,
        companyName: l.coverLetter.application.companyName,
        coverLetterId: l.coverLetter.id,
      }))}
    />
  );
}
