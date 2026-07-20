import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { badRequest, forbidden, unauthorized } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { applicationCreateSchema } from "@/lib/applications/schema";

function toItem(
  app: {
    id: string;
    title: string;
    description: string | null;
    companyName: string | null;
    jobUrl: string | null;
    status: ApplicationStatus;
    appliedAt: Date | null;
    linkedResumeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    linkedResume: { id: string; title: string } | null;
  },
) {
  return {
    id: app.id,
    title: app.title,
    description: app.description,
    companyName: app.companyName,
    jobUrl: app.jobUrl,
    status: app.status,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    linkedResumeId: app.linkedResumeId,
    linkedResumeTitle: app.linkedResume?.title ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const applications = await prisma.jobApplication.findMany({
    where: { userId: session.user.id },
    include: { linkedResume: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    applications: applications.map(toItem),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const parsed = applicationCreateSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return badRequest("Invalid application payload", parsed.error.flatten());
  }

  const data = parsed.data;
  if (data.jobUrl) {
    try {
      new URL(data.jobUrl);
    } catch {
      return badRequest("jobUrl must be a valid URL");
    }
  }

  if (data.linkedResumeId) {
    const owned = await prisma.masterResumeProfile.findFirst({
      where: { id: data.linkedResumeId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return forbidden("linkedResumeId must reference one of your resumes");
    }
  }

  const created = await prisma.jobApplication.create({
    data: {
      userId: session.user.id,
      title: data.title,
      description: data.description ?? null,
      companyName: data.companyName ?? null,
      jobUrl: data.jobUrl ?? null,
      status: data.status ?? ApplicationStatus.interested,
      appliedAt: data.appliedAt ?? null,
      linkedResumeId: data.linkedResumeId ?? null,
    },
    include: { linkedResume: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ application: toItem(created) }, { status: 201 });
}
