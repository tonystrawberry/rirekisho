import type { MasterResume, Provenance, ResumePatch } from "@/lib/resume/schema";
import { isItemDeleteMarker } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";

function isUserConfirmed(provenance: Provenance) {
  return provenance === "user";
}

function mergeByKey<T extends { id: string; provenance: Provenance }>(
  existing: T[],
  incoming: T[],
  keyOf: (item: T) => string,
  preferIncomingWhen?: (a: T, b: T) => boolean,
): T[] {
  const map = new Map<string, T>();
  for (const item of existing) map.set(keyOf(item), item);
  for (const item of incoming) {
    const key = keyOf(item);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, item);
      continue;
    }
    if (isUserConfirmed(prev.provenance)) continue;
    if (preferIncomingWhen?.(prev, item) || !isUserConfirmed(item.provenance)) {
      // Keep stable id from the first-seen row when re-import generates new ids
      const merged = {
        ...prev,
        ...item,
        id: prev.id,
        provenance: item.provenance,
      } as T & { logoUrl?: string };
      const prevLogo = (prev as { logoUrl?: string }).logoUrl;
      const nextLogo = (item as { logoUrl?: string }).logoUrl;
      if (prevLogo && !nextLogo) merged.logoUrl = prevLogo;
      map.set(key, merged);
    }
  }
  return Array.from(map.values());
}

function experienceKey(item: {
  id: string;
  company: string;
  title: string;
}) {
  return `${item.company.trim().toLowerCase()}|${item.title.trim().toLowerCase()}`;
}

function educationKey(item: {
  id: string;
  institution: string;
  degree?: string;
}) {
  return `${item.institution.trim().toLowerCase()}|${(item.degree ?? "").trim().toLowerCase()}`;
}

function projectKey(item: { id: string; name: string }) {
  return item.name.trim().toLowerCase();
}

function unionSkills(
  existing: MasterResume["skills"],
  incoming: MasterResume["skills"],
) {
  const byName = new Map<string, MasterResume["skills"][number]>();
  for (const s of [...existing, ...incoming]) {
    const key = s.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, s);
      continue;
    }
    if (isUserConfirmed(prev.provenance)) {
      // Keep confirmed skill but fill missing proficiency from incoming
      if (!prev.proficiency && s.proficiency) {
        byName.set(key, { ...prev, proficiency: s.proficiency });
      }
      continue;
    }
    byName.set(key, {
      ...s,
      proficiency: s.proficiency ?? prev.proficiency,
    });
  }
  return Array.from(byName.values());
}

export type MergeOptions = {
  incomingSource: "github" | "linkedin";
};

/**
 * Deterministic merge:
 * - Employment chronology: prefer LinkedIn
 * - Projects/skills: prefer GitHub signals, union skills
 * - Identity: user > linkedin > github for non-empty fields
 * - Never overwrite provenance:user without conflict flag (skipped overwrite)
 */
export function mergeMasterResume(
  base: MasterResume,
  incoming: MasterResume,
  options: MergeOptions,
): { data: MasterResume; conflicts: string[] } {
  const conflicts: string[] = [];
  const preferLinkedIn = options.incomingSource === "linkedin";
  const preferGitHub = options.incomingSource === "github";

  const identity = { ...base.identity };
  // Never overwrite a user-uploaded photo via social import
  const preservedPhoto = base.identity.photoUrl;
  const idFields: Array<"fullName" | "headline" | "email" | "phone" | "location"> = [
    "fullName",
    "headline",
    "email",
    "phone",
    "location",
  ];
  for (const field of idFields) {
    const current = identity[field];
    const next = incoming.identity[field];
    if (!next) continue;
    if (!current || current === "Your Name") {
      identity[field] = next;
    } else if (current !== next && preferLinkedIn) {
      conflicts.push(`identity.${String(field)}`);
    }
  }
  if (preservedPhoto) identity.photoUrl = preservedPhoto;
  identity.links = [
    ...(identity.links ?? []),
    ...(incoming.identity.links ?? []),
  ].filter(
    (link, i, arr) => arr.findIndex((l) => l.url === link.url) === i,
  );

  let experience = base.experience;
  let projects = base.projects;
  if (preferLinkedIn) {
    experience = mergeByKey(
      base.experience,
      incoming.experience,
      experienceKey,
      () => true,
    );
    projects = mergeByKey(base.projects, incoming.projects, projectKey);
  } else if (preferGitHub) {
    experience = mergeByKey(
      base.experience,
      incoming.experience,
      experienceKey,
    );
    projects = mergeByKey(
      base.projects,
      incoming.projects,
      projectKey,
      () => true,
    );
  }

  const education = preferLinkedIn
    ? mergeByKey(base.education, incoming.education, educationKey, () => true)
    : mergeByKey(base.education, incoming.education, educationKey);

  const skills = unionSkills(base.skills, incoming.skills);

  const summary =
    base.summary && base.summary.length > 20
      ? base.summary
      : incoming.summary || base.summary;

  const merged: MasterResume = {
    ...base,
    identity,
    summary,
    experience,
    education,
    skills,
    projects,
    certifications: [
      ...(base.certifications ?? []),
      ...(incoming.certifications ?? []),
    ].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i),
    references: [
      ...(base.references ?? []),
      ...(incoming.references ?? []),
    ].filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i),
    hobbies: [
      ...(base.hobbies ?? []),
      ...(incoming.hobbies ?? []),
    ].filter((h, i, arr) => arr.findIndex((x) => x.id === h.id) === i),
    meta: {
      ...base.meta,
      schemaVersion: 1,
    },
  };

  const completeness = computeCompleteness(merged);
  merged.meta.gaps = completeness.gaps;

  return { data: merged, conflicts };
}

export function applyConfirmedPatch(
  base: MasterResume,
  patch: ResumePatch,
): MasterResume {
  const mergeItemsById = <T extends { id: string }>(
    current: T[],
    incoming: Array<T | { id: string; _delete: true }> | undefined,
  ): T[] => {
    if (incoming === undefined) return current;
    const byId = new Map(current.map((item) => [item.id, item]));
    for (const item of incoming) {
      if (isItemDeleteMarker(item)) {
        byId.delete(item.id);
        continue;
      }
      const prev = byId.get(item.id);
      byId.set(item.id, prev ? { ...prev, ...item } : (item as T));
    }
    return Array.from(byId.values());
  };

  const next: MasterResume = {
    ...base,
    ...patch,
    identity: { ...base.identity, ...patch.identity },
    experience: mergeItemsById(base.experience, patch.experience),
    education: mergeItemsById(base.education, patch.education),
    skills: mergeItemsById(base.skills, patch.skills),
    projects: mergeItemsById(base.projects, patch.projects),
    certifications: mergeItemsById(
      base.certifications ?? [],
      patch.certifications,
    ),
    references: mergeItemsById(base.references ?? [], patch.references),
    hobbies: mergeItemsById(base.hobbies ?? [], patch.hobbies),
    meta: {
      ...base.meta,
      ...patch.meta,
      lastEnrichedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };

  // Upgrade ai_suggested → user on confirmed apply
  const upgrade = <T extends { provenance: Provenance }>(items: T[]) =>
    items.map((item) =>
      item.provenance === "ai_suggested"
        ? { ...item, provenance: "user" as const }
        : item,
    );

  next.experience = upgrade(next.experience);
  next.education = upgrade(next.education);
  next.skills = upgrade(next.skills);
  next.projects = upgrade(next.projects);
  next.certifications = upgrade(next.certifications ?? []);
  next.references = upgrade(next.references ?? []);
  next.hobbies = upgrade(next.hobbies ?? []);

  const completeness = computeCompleteness(next);
  next.meta.gaps = completeness.gaps;
  return next;
}
