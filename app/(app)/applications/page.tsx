import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApplicationsClient, type ApplicationListItem } from "./applications-client";

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const applications = await prisma.jobApplication.findMany({
    where: { userId: session.user.id },
    include: { linkedResume: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const initialApplications: ApplicationListItem[] = applications.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    companyName: a.companyName,
    jobUrl: a.jobUrl,
    status: a.status,
    appliedAt: a.appliedAt?.toISOString() ?? null,
    linkedResumeId: a.linkedResumeId,
    linkedResumeTitle: a.linkedResume?.title ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <ApplicationsClient initialApplications={initialApplications} />;
}
