import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notFound, unauthorized } from "@/lib/api-error";
import {
  duplicateProfile,
  profileListItem,
  profileToResponse,
} from "@/lib/etl/persist";

type Params = { params: Promise<{ profileId: string }> };

/** Create a copy of an owned resume (content + translations; not chat/shares). */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { profileId } = await params;
  const body = (await req.json().catch(() => ({}))) as { title?: string };

  const created = await duplicateProfile(session.user.id, profileId, {
    title: typeof body.title === "string" ? body.title : undefined,
  });
  if (!created) return notFound("Resume not found");

  return NextResponse.json(
    {
      profile: profileToResponse(created),
      resume: profileListItem(created),
    },
    { status: 201 },
  );
}
