import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  ApplicationDetailClient,
  type ApplicationDetail,
  type DetailTab,
} from "./application-detail-client";

type PageProps = {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): DetailTab {
  return value === "cover-letter" ? "cover-letter" : "information";
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { applicationId } = await params;
  const { tab: tabParam } = await searchParams;
  const activeTab = parseTab(tabParam);

  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId: session.user.id },
    include: { linkedResume: { select: { id: true, title: true } } },
  });

  if (!app) notFound();

  const application: ApplicationDetail = {
    id: app.id,
    title: app.title,
    description: app.description,
    companyName: app.companyName,
    jobUrl: app.jobUrl,
    status: app.status,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    linkedResumeId: app.linkedResumeId,
    linkedResumeTitle: app.linkedResume?.title ?? null,
    updatedAt: app.updatedAt.toISOString(),
  };

  return (
    <ApplicationDetailClient
      application={application}
      initialTab={activeTab}
    />
  );
}
