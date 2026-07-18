import { z } from "zod";
import { skillProficiencyIds } from "@/lib/resume/skill-proficiency";

export const provenanceSchema = z.enum([
  "github",
  "linkedin",
  "user",
  "ai_suggested",
]);

export const skillProficiencySchema = z.enum(skillProficiencyIds);

export type Provenance = z.infer<typeof provenanceSchema>;

const linkSchema = z.object({
  label: z.string(),
  url: z.string().url().or(z.string().min(1)),
});

export const experienceItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  bullets: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  /** Company logo path (/uploads/...) or URL */
  logoUrl: z.string().optional(),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const educationItemSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  /** School / institution logo path (/uploads/...) or URL */
  logoUrl: z.string().optional(),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const skillItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** How often / deeply the person uses the skill */
  proficiency: skillProficiencySchema.optional(),
  category: z.string().optional(),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const projectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const certificationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  /** Badge / issuer icon path (/uploads/...) or URL */
  logoUrl: z.string().optional(),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const referenceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.string().optional(),
  company: z.string().optional(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional(),
  provenance: provenanceSchema,
  sourceRefs: z.array(z.string()).optional(),
});

export const hobbyItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  provenance: provenanceSchema.default("user"),
  sourceRefs: z.array(z.string()).optional(),
});

export const gapSchema = z.object({
  section: z.string(),
  path: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  message: z.string(),
});

export const masterResumeSchema = z.object({
  identity: z.object({
    fullName: z.string().min(1),
    /** Professional title shown under the name, e.g. "Ruby on Rails Engineer — Spacely Inc" */
    headline: z.string().optional(),
    email: z
      .union([z.string().email(), z.literal("")])
      .optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    /** Public path (/uploads/...) or https/data URL for resume photo */
    photoUrl: z.string().optional(),
    links: z.array(linkSchema).optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  skills: z.array(skillItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  references: z.array(referenceItemSchema).default([]),
  hobbies: z.array(hobbyItemSchema).default([]),
  meta: z.object({
    schemaVersion: z.number().int().min(1),
    gaps: z.array(gapSchema).default([]),
    lastEnrichedAt: z.string().optional(),
  }),
});

export type MasterResume = z.infer<typeof masterResumeSchema>;
export type ResumeGap = z.infer<typeof gapSchema>;

/** Marker used in patches to remove an item by id (and its nested children). */
export const itemDeleteMarkerSchema = z.object({
  id: z.string(),
  _delete: z.literal(true),
});

export type ItemDeleteMarker = z.infer<typeof itemDeleteMarkerSchema>;

const patchExperienceItemSchema = z.union([
  experienceItemSchema,
  itemDeleteMarkerSchema,
]);
const patchEducationItemSchema = z.union([
  educationItemSchema,
  itemDeleteMarkerSchema,
]);
const patchSkillItemSchema = z.union([skillItemSchema, itemDeleteMarkerSchema]);
const patchProjectItemSchema = z.union([
  projectItemSchema,
  itemDeleteMarkerSchema,
]);
const patchCertificationItemSchema = z.union([
  certificationItemSchema,
  itemDeleteMarkerSchema,
]);
const patchReferenceItemSchema = z.union([
  referenceItemSchema,
  itemDeleteMarkerSchema,
]);
const patchHobbyItemSchema = z.union([hobbyItemSchema, itemDeleteMarkerSchema]);

export const resumePatchSchema = z.object({
  identity: masterResumeSchema.shape.identity.partial().optional(),
  summary: z.string().optional(),
  experience: z.array(patchExperienceItemSchema).optional(),
  education: z.array(patchEducationItemSchema).optional(),
  skills: z.array(patchSkillItemSchema).optional(),
  projects: z.array(patchProjectItemSchema).optional(),
  certifications: z.array(patchCertificationItemSchema).optional(),
  references: z.array(patchReferenceItemSchema).optional(),
  hobbies: z.array(patchHobbyItemSchema).optional(),
  meta: masterResumeSchema.shape.meta.partial().optional(),
});

export type ResumePatch = z.infer<typeof resumePatchSchema>;

export function isItemDeleteMarker(
  item: unknown,
): item is ItemDeleteMarker {
  return (
    !!item &&
    typeof item === "object" &&
    "_delete" in item &&
    (item as ItemDeleteMarker)._delete === true &&
    typeof (item as ItemDeleteMarker).id === "string"
  );
}

export function deleteItemMarker(id: string): ItemDeleteMarker {
  return { id, _delete: true };
}

export function deleteItemsMarkers(
  items: Array<{ id: string }>,
): ItemDeleteMarker[] {
  return items.map((item) => deleteItemMarker(item.id));
}
