import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { applicationUpdateSchema } from "@/lib/applications/schema";

type Params = { params: Promise<{ applicationId: string }> };

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

async function getOwned(userId: string, id: string) {
  return prisma.jobApplication.findFirst({
    where: { id, userId },
    include: { linkedResume: { select: { id: true, title: true } } },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const app = await getOwned(session.user.id, applicationId);
  if (!app) return notFound("Application not found");

  return NextResponse.json({ application: toItem(app) });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const existing = await getOwned(session.user.id, applicationId);
  if (!existing) return notFound("Application not found");

  const parsed = applicationUpdateSchema.safeParse(
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

  if (data.title !== undefined && !data.title) {
    return badRequest("title is required");
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

  const updated = await prisma.jobApplication.update({
    where: { id: existing.id },
    data: {
      title: data.title ?? undefined,
      description: data.description === undefined ? undefined : data.description,
      companyName: data.companyName === undefined ? undefined : data.companyName,
      jobUrl: data.jobUrl === undefined ? undefined : data.jobUrl,
      status: data.status ?? undefined,
      appliedAt: data.appliedAt === undefined ? undefined : data.appliedAt,
      linkedResumeId:
        data.linkedResumeId === undefined ? undefined : data.linkedResumeId,
    },
    include: { linkedResume: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ application: toItem(updated) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { applicationId } = await params;

  const existing = await getOwned(session.user.id, applicationId);
  if (!existing) return notFound("Application not found");

  await prisma.jobApplication.delete({ where: { id: existing.id } });

  return NextResponse.json({ deleted: true, id: existing.id });
}
