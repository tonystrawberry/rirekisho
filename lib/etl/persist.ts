import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MasterResume } from "@/lib/resume/schema";
import { createEmptyMasterResume } from "@/lib/resume/empty-profile";
import { computeCompleteness } from "@/lib/resume/completeness";

export async function listProfiles(userId: string) {
  return prisma.masterResumeProfile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/** Load a profile owned by the user, or null. */
export async function getOwnedProfile(userId: string, profileId: string) {
  return prisma.masterResumeProfile.findFirst({
    where: { id: profileId, userId },
  });
}

export async function createProfile(
  userId: string,
  options?: { fullName?: string; title?: string; sourceLocale?: string },
) {
  const data = createEmptyMasterResume(options?.fullName || "Your Name");
  const completeness = computeCompleteness(data);
  const locale = options?.sourceLocale || "en";
  return prisma.masterResumeProfile.create({
    data: {
      userId,
      title: options?.title?.trim() || "Untitled resume",
      data: data as unknown as Prisma.InputJsonValue,
      completeness: completeness as unknown as Prisma.InputJsonValue,
      sourceLocale: locale,
      selectedLocale: locale,
    },
  });
}

function defaultCopyTitle(title: string): string {
  const base = title.trim() || "Untitled resume";
  return `${base} (copy)`;
}

/**
 * Duplicate a resume owned by the user: master data, template/colors/locales,
 * and locale presentations. Does not copy chat, import snapshots, exports,
 * share links, or job-application links.
 */
export async function duplicateProfile(
  userId: string,
  profileId: string,
  options?: { title?: string },
) {
  const source = await prisma.masterResumeProfile.findFirst({
    where: { id: profileId, userId },
    include: { localePresentations: true },
  });
  if (!source) return null;

  const title =
    options?.title?.trim() || defaultCopyTitle(source.title);

  return prisma.$transaction(async (tx) => {
    const created = await tx.masterResumeProfile.create({
      data: {
        userId,
        title,
        data: source.data as Prisma.InputJsonValue,
        completeness: source.completeness as Prisma.InputJsonValue,
        selectedTemplateId: source.selectedTemplateId,
        primaryColor: source.primaryColor,
        sourceLocale: source.sourceLocale,
        selectedLocale: source.selectedLocale,
        version: 1,
      },
    });

    if (source.localePresentations.length > 0) {
      await tx.localePresentation.createMany({
        data: source.localePresentations.map((p) => ({
          profileId: created.id,
          locale: p.locale,
          data: p.data as Prisma.InputJsonValue,
          // Match new profile version so translations are not marked stale.
          sourceVersion: 1,
        })),
      });
    }

    return created;
  });
}

/**
 * @deprecated Prefer createProfile / getOwnedProfile. Kept for call sites that
 * previously auto-created the single profile — now creates only when none exist,
 * otherwise returns the most recently updated profile.
 */
export async function ensureProfile(userId: string, fullName?: string) {
  const existing = await prisma.masterResumeProfile.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;
  return createProfile(userId, { fullName });
}

export async function saveMasterResume(params: {
  profileId: string;
  data: MasterResume;
  expectedVersion?: number;
}) {
  const completeness = computeCompleteness(params.data);
  if (params.expectedVersion !== undefined) {
    const result = await prisma.masterResumeProfile.updateMany({
      where: { id: params.profileId, version: params.expectedVersion },
      data: {
        data: params.data as unknown as Prisma.InputJsonValue,
        completeness: completeness as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return prisma.masterResumeProfile.findUniqueOrThrow({
      where: { id: params.profileId },
    });
  }

  return prisma.masterResumeProfile.update({
    where: { id: params.profileId },
    data: {
      data: params.data as unknown as Prisma.InputJsonValue,
      completeness: completeness as unknown as Prisma.InputJsonValue,
      version: { increment: 1 },
    },
  });
}

export function profileToResponse(profile: {
  id: string;
  title?: string;
  data: unknown;
  completeness: unknown;
  selectedTemplateId: string;
  primaryColor?: string;
  sourceLocale: string;
  selectedLocale: string;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: profile.id,
    title: profile.title ?? "Untitled resume",
    data: profile.data,
    completeness: profile.completeness,
    selectedTemplateId: profile.selectedTemplateId,
    primaryColor: profile.primaryColor ?? "#0f6e56",
    sourceLocale: profile.sourceLocale,
    selectedLocale: profile.selectedLocale,
    version: profile.version,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function profileListItem(profile: {
  id: string;
  title?: string;
  selectedLocale: string;
  selectedTemplateId: string;
  completeness: unknown;
  updatedAt: Date;
  version: number;
}) {
  const completeness = profile.completeness as { score?: number } | null;
  return {
    id: profile.id,
    title: profile.title ?? "Untitled resume",
    selectedLocale: profile.selectedLocale,
    selectedTemplateId: profile.selectedTemplateId,
    completenessScore:
      typeof completeness?.score === "number" ? completeness.score : null,
    version: profile.version,
    updatedAt: profile.updatedAt.toISOString(),
  };
}
