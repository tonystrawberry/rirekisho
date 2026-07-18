import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import {
  badRequest,
  conflict,
  notFound,
  unauthorized,
} from "@/lib/api-error";
import { normalizeResumePatch } from "@/lib/ai/enrich-chat";
import { applyConfirmedPatch } from "@/lib/resume/merge";
import { computeCompleteness } from "@/lib/resume/completeness";
import {
  masterResumeSchema,
  resumePatchSchema,
  type MasterResume,
  type ResumePatch,
} from "@/lib/resume/schema";
import {
  createProfile,
  getOwnedProfile,
  listProfiles,
  profileListItem,
  profileToResponse,
  saveMasterResume,
} from "@/lib/etl/persist";
import {
  scheduleLocaleSync,
  syncAllLocalePresentations,
} from "@/lib/resume/locale-presentations";

/** List all resumes for the current user. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const profiles = await listProfiles(session.user.id);
  return NextResponse.json({
    resumes: profiles.map(profileListItem),
  });
}

/** Create a new resume. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    sourceLocale?: string;
    title?: string;
    fullName?: string;
  };

  const profile = await createProfile(session.user.id, {
    fullName: body.fullName || session.user.name || undefined,
    title: body.title,
    sourceLocale: body.sourceLocale,
  });

  return NextResponse.json(
    { profile: profileToResponse(profile) },
    { status: 201 },
  );
}

/**
 * Apply a chat patch, direct inline edit, or full JSON replace to a resume.
 * - mode "ai" (default): requires confirmAiSuggestions
 * - mode "direct": inline preview edits (partial patch)
 * - mode "replace": full MasterResume JSON replacement
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = (await req.json()) as {
    profileId?: string;
    version?: number;
    patch?: unknown;
    data?: unknown;
    confirmAiSuggestions?: boolean;
    mode?: "direct" | "ai" | "replace";
  };

  if (!body.profileId) return badRequest("profileId is required");
  if (typeof body.version !== "number") {
    return badRequest("version is required");
  }

  const profile = await getOwnedProfile(session.user.id, body.profileId);
  if (!profile) return notFound("Resume not found");

  const previousData = masterResumeSchema.parse(profile.data);
  let next: MasterResume;

  if (body.mode === "replace") {
    if (!body.data) return badRequest("data is required for replace mode");
    const parsed = masterResumeSchema.safeParse(body.data);
    if (!parsed.success) {
      return badRequest("Invalid resume data", parsed.error.flatten());
    }
    const completeness = computeCompleteness(parsed.data);
    next = {
      ...parsed.data,
      meta: {
        ...parsed.data.meta,
        schemaVersion: 1,
        gaps: completeness.gaps,
        lastEnrichedAt: new Date().toISOString(),
      },
    };
  } else {
    if (!body.patch) return badRequest("patch is required");

    const isDirect = body.mode === "direct";
    if (!isDirect && !body.confirmAiSuggestions) {
      return badRequest(
        "confirmAiSuggestions must be true to apply AI patches",
      );
    }

    const normalized = normalizeResumePatch(body.patch);
    if (!normalized) {
      return badRequest("Invalid patch");
    }
    const parsed = resumePatchSchema.safeParse(normalized);
    if (!parsed.success) {
      return badRequest("Invalid patch", parsed.error.flatten());
    }

    const patch = parsed.data as ResumePatch;

    if (isDirect) {
      const stampUser = <
        T extends { id?: string; provenance?: string; _delete?: boolean },
      >(
        items: T[] | undefined,
      ) =>
        items?.map((item) =>
          item._delete ? item : { ...item, provenance: "user" as const },
        );
      if (patch.experience) patch.experience = stampUser(patch.experience);
      if (patch.education) patch.education = stampUser(patch.education);
      if (patch.skills) patch.skills = stampUser(patch.skills);
      if (patch.projects) patch.projects = stampUser(patch.projects);
      if (patch.certifications)
        patch.certifications = stampUser(patch.certifications);
      if (patch.references) patch.references = stampUser(patch.references);
      if (patch.hobbies) patch.hobbies = stampUser(patch.hobbies);
    }

    next = applyConfirmedPatch(previousData, patch);
  }

  const isAiApply =
    body.mode !== "direct" &&
    body.mode !== "replace" &&
    Boolean(body.confirmAiSuggestions);

  try {
    const updated = await saveMasterResume({
      profileId: profile.id,
      data: next,
      expectedVersion: body.version,
    });

    let translations:
      | Array<{ locale: string; ok: boolean; error?: string }>
      | undefined;

    const sourceData = masterResumeSchema.parse(updated.data);
    const syncParams = {
      profileId: updated.id,
      sourceLocale: updated.sourceLocale,
      sourceVersion: updated.version,
      sourceData,
      previousData,
    };

    if (isAiApply) {
      // Wait so Confirm & apply returns with JA/FR already refreshed.
      translations = await syncAllLocalePresentations(syncParams);
    } else {
      // Preview / structured edits: translate in the background so save stays snappy.
      // Rapid inline commits coalesce to the latest version.
      after(() => {
        void scheduleLocaleSync(syncParams);
      });
    }

    return NextResponse.json({
      profile: profileToResponse(updated),
      ...(translations ? { translations } : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "VERSION_CONFLICT") {
      return conflict("Profile version conflict; reload and retry");
    }
    throw e;
  }
}
