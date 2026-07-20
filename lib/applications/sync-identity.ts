import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  normalizeCoverLetterIdentity,
  parseCoverLetterIdentity,
  type CoverLetterIdentity,
} from "@/lib/cover-letter/identity";
import { getOrCreateCoverLetter } from "@/lib/applications/cover-letter";
import { masterResumeSchema, type MasterResume } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";

export type PersonalIdentityInput = {
  fullName: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
};

export function personalInputToIdentity(
  input: PersonalIdentityInput,
  photoUrl?: string,
): CoverLetterIdentity {
  const fullName = input.fullName.trim() || "Your Name";
  const website = input.website?.trim();
  return {
    fullName,
    ...(input.headline?.trim() ? { headline: input.headline.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(website ? { links: [{ label: "Website", url: website }] } : {}),
  };
}

export function identityToPersonalInput(
  identity: CoverLetterIdentity,
): {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
} {
  const website =
    identity.links?.find((l) => l.url.trim())?.url ??
    identity.links?.[0]?.url ??
    "";
  return {
    fullName: identity.fullName || "",
    headline: identity.headline ?? "",
    email: identity.email ?? "",
    phone: identity.phone ?? "",
    location: identity.location ?? "",
    website,
  };
}

/** Resolve display identity: cover letter override, else linked resume. */
export function resolveApplicationIdentity(opts: {
  coverLetterIdentity: unknown;
  linkedResumeData: unknown;
}): CoverLetterIdentity {
  return (
    normalizeCoverLetterIdentity(opts.coverLetterIdentity) ??
    parseCoverLetterIdentity(opts.linkedResumeData)
  );
}

function toResumeIdentity(identity: CoverLetterIdentity): MasterResume["identity"] {
  return {
    fullName: identity.fullName,
    ...(identity.headline ? { headline: identity.headline } : {}),
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.phone ? { phone: identity.phone } : {}),
    ...(identity.location ? { location: identity.location } : {}),
    ...(identity.photoUrl ? { photoUrl: identity.photoUrl } : {}),
    ...(identity.links?.length
      ? {
          links: identity.links.map((l) => ({
            label: l.label?.trim() || "Website",
            url: l.url,
          })),
        }
      : {}),
  };
}

function readPhotoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const identity = (data as { identity?: unknown }).identity;
  if (!identity || typeof identity !== "object") return undefined;
  const photoUrl = (identity as { photoUrl?: unknown }).photoUrl;
  return typeof photoUrl === "string" && photoUrl.trim()
    ? photoUrl
    : undefined;
}

function patchResumeDataIdentity(
  data: unknown,
  identity: CoverLetterIdentity,
): MasterResume | null {
  const parsed = masterResumeSchema.safeParse(data);
  if (parsed.success) {
    return {
      ...parsed.data,
      identity: toResumeIdentity({
        ...identity,
        photoUrl: identity.photoUrl || parsed.data.identity.photoUrl,
      }),
    };
  }

  // Fallback: mutate identity even when the full resume fails strict parse.
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const existingIdentity =
    raw.identity && typeof raw.identity === "object"
      ? (raw.identity as Record<string, unknown>)
      : {};
  const nextIdentity = toResumeIdentity({
    ...identity,
    photoUrl:
      identity.photoUrl ||
      (typeof existingIdentity.photoUrl === "string"
        ? existingIdentity.photoUrl
        : undefined),
  });
  return {
    ...(raw as unknown as MasterResume),
    identity: nextIdentity,
  };
}

/**
 * Overwrite cover-letter identity and (when linked) resume identity.
 * Preserves existing photoUrl on both when the form does not send a new one.
 */
export async function syncIdentityFromApplication(opts: {
  userId: string;
  applicationId: string;
  linkedResumeId: string | null;
  identity: PersonalIdentityInput;
}): Promise<CoverLetterIdentity> {
  const cl = await getOrCreateCoverLetter(opts.userId, opts.applicationId);
  if (!cl) throw new Error("Application not found");

  const existingClPhoto =
    normalizeCoverLetterIdentity(cl.coverLetter.identity)?.photoUrl;
  const resumeProfile = opts.linkedResumeId
    ? await prisma.masterResumeProfile.findFirst({
        where: { id: opts.linkedResumeId, userId: opts.userId },
        include: { localePresentations: true },
      })
    : null;

  const resumePhoto = resumeProfile
    ? readPhotoUrl(resumeProfile.data)
    : undefined;
  const photoUrl = existingClPhoto || resumePhoto;
  const next = personalInputToIdentity(opts.identity, photoUrl);

  await prisma.coverLetter.update({
    where: { id: cl.coverLetter.id },
    data: { identity: next as unknown as Prisma.InputJsonValue },
  });

  if (resumeProfile) {
    const patched = patchResumeDataIdentity(resumeProfile.data, next);
    if (patched) {
      const completeness = computeCompleteness(patched);
      await prisma.masterResumeProfile.update({
        where: { id: resumeProfile.id },
        data: {
          data: patched as unknown as Prisma.InputJsonValue,
          completeness: completeness as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
    }

    // Keep translated snapshots' header in sync when present.
    for (const presentation of resumeProfile.localePresentations) {
      const localePatched = patchResumeDataIdentity(presentation.data, next);
      if (!localePatched) continue;
      await prisma.localePresentation.update({
        where: { id: presentation.id },
        data: {
          data: localePatched as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  return next;
}
