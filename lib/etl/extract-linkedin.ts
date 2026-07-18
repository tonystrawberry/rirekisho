import { generateObject } from "ai";
import { getChatModel, hasLlmKey } from "@/lib/ai/models";
import {
  masterResumeSchema,
  type MasterResume,
} from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";

type LinkedInDate = {
  year?: number;
  month?: number | string;
  day?: number;
  text?: string;
} | null;

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function formatDate(d?: LinkedInDate) {
  if (!d?.year) return undefined;
  let month = "01";
  if (typeof d.month === "number") {
    month = String(d.month).padStart(2, "0");
  } else if (typeof d.month === "string") {
    month =
      MONTHS[d.month.trim().toLowerCase()] ||
      (/^\d+$/.test(d.month) ? d.month.padStart(2, "0") : "01");
  }
  return `${d.year}-${month}`;
}

function isPresentEnd(d?: LinkedInDate) {
  if (!d) return true;
  if (typeof d.text === "string" && /present/i.test(d.text)) return true;
  return !d.year;
}

function splitBullets(description?: string | null) {
  if (!description?.trim()) return [] as string[];
  return description
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 8);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Deterministic mapping from Proxycurl-like or HarvestAPI/Apify LinkedIn JSON
 * → MasterResume. Used when no LLM key is set, or as a fast fallback.
 */
export function mapLinkedInPayloadToResume(
  payload: unknown,
  profileUrl: string,
): MasterResume {
  const p = asRecord(payload);

  // Proxycurl: experiences / HarvestAPI: experience
  const experiences = Array.isArray(p.experiences)
    ? p.experiences
    : Array.isArray(p.experience)
      ? p.experience
      : [];
  const education = Array.isArray(p.education) ? p.education : [];
  const skillsRaw = Array.isArray(p.skills)
    ? p.skills
    : typeof p.topSkills === "string"
      ? p.topSkills.split(/[•,|]/).map((s) => s.trim()).filter(Boolean)
      : [];
  const projects = Array.isArray(p.accomplishment_projects)
    ? p.accomplishment_projects
    : Array.isArray(p.projects)
      ? p.projects
      : [];
  const certifications = Array.isArray(p.certifications) ? p.certifications : [];

  const fullName =
    (typeof p.full_name === "string" && p.full_name) ||
    (typeof p.fullName === "string" && p.fullName) ||
    [p.first_name ?? p.firstName, p.last_name ?? p.lastName]
      .filter((x) => typeof x === "string")
      .join(" ") ||
    "Your Name";

  const locationObj = asRecord(p.location);
  const parsedLoc = asRecord(locationObj.parsed);
  const city =
    (typeof p.city === "string" && p.city) ||
    (typeof parsedLoc.city === "string" && parsedLoc.city) ||
    "";
  const country =
    (typeof p.country === "string" && p.country) ||
    (typeof parsedLoc.country === "string" && parsedLoc.country) ||
    "";
  const locationText =
    (typeof locationObj.linkedinText === "string" && locationObj.linkedinText) ||
    (typeof parsedLoc.text === "string" && parsedLoc.text) ||
    [city, country].filter(Boolean).join(", ") ||
    undefined;

  const linkedInUrl =
    (typeof p.linkedinUrl === "string" && p.linkedinUrl) ||
    (typeof p.profile_url === "string" && p.profile_url) ||
    profileUrl;

  const email =
    (typeof p.email === "string" && p.email) ||
    (typeof p.emailAddress === "string" && p.emailAddress) ||
    undefined;

  const headline =
    (typeof p.headline === "string" && p.headline.trim()) || undefined;

  const data: MasterResume = {
    identity: {
      fullName,
      ...(headline ? { headline } : {}),
      email,
      location: locationText,
      links: [{ label: "LinkedIn", url: linkedInUrl }],
    },
    summary:
      (typeof p.summary === "string" && p.summary) ||
      (typeof p.about === "string" && p.about) ||
      "",
    experience: experiences.map((raw, i) => {
      const exp = asRecord(raw);
      const bullets = splitBullets(
        typeof exp.description === "string" ? exp.description : undefined,
      );
      const end = (exp.ends_at ?? exp.endDate) as LinkedInDate;
      return {
        id: `li_exp_${i + 1}`,
        company: String(
          exp.company || exp.company_name || exp.companyName || "Company",
        ),
        title: String(exp.title || exp.position || "Role"),
        location: typeof exp.location === "string" ? exp.location : undefined,
        startDate: formatDate((exp.starts_at ?? exp.startDate) as LinkedInDate),
        endDate: isPresentEnd(end) ? undefined : formatDate(end),
        current: isPresentEnd(end),
        bullets,
        metrics: [],
        provenance: "linkedin" as const,
        sourceRefs: [linkedInUrl],
      };
    }),
    education: education.map((raw, i) => {
      const ed = asRecord(raw);
      return {
        id: `li_edu_${i + 1}`,
        institution: String(
          ed.school || ed.school_name || ed.schoolName || "School",
        ),
        degree:
          (typeof ed.degree_name === "string" && ed.degree_name) ||
          (typeof ed.degree === "string" && ed.degree) ||
          undefined,
        field:
          (typeof ed.field_of_study === "string" && ed.field_of_study) ||
          (typeof ed.fieldOfStudy === "string" && ed.fieldOfStudy) ||
          (typeof ed.degreeName === "string" && ed.degreeName) ||
          undefined,
        startDate: formatDate((ed.starts_at ?? ed.startDate) as LinkedInDate),
        endDate: formatDate((ed.ends_at ?? ed.endDate) as LinkedInDate),
        provenance: "linkedin" as const,
        sourceRefs: [linkedInUrl],
      };
    }),
    skills: skillsRaw
      .map((s, i) => {
        const name =
          typeof s === "string"
            ? s
            : typeof asRecord(s).name === "string"
              ? String(asRecord(s).name)
              : typeof asRecord(s).title === "string"
                ? String(asRecord(s).title)
                : "";
        if (!name) return null;
        return {
          id: `li_skill_${i + 1}`,
          name,
          provenance: "linkedin" as const,
          sourceRefs: [linkedInUrl],
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    projects: projects.map((raw, i) => {
      const proj = asRecord(raw);
      return {
        id: `li_proj_${i + 1}`,
        name: String(proj.title || proj.name || `Project ${i + 1}`),
        description:
          typeof proj.description === "string" ? proj.description : undefined,
        url: typeof proj.url === "string" ? proj.url : undefined,
        highlights: [],
        technologies: [],
        provenance: "linkedin" as const,
        sourceRefs: [linkedInUrl],
      };
    }),
    certifications: certifications.map((raw, i) => {
      const cert = asRecord(raw);
      return {
        id: `li_cert_${i + 1}`,
        name: String(cert.name || cert.title || "Certification"),
        issuer:
          (typeof cert.authority === "string" && cert.authority) ||
          (typeof cert.company === "string" && cert.company) ||
          (typeof cert.companyName === "string" && cert.companyName) ||
          undefined,
        date: formatDate(
          (cert.starts_at ?? cert.startDate ?? cert.issuedOn) as LinkedInDate,
        ),
        provenance: "linkedin" as const,
        sourceRefs: [linkedInUrl],
      };
    }),
    references: [],
    hobbies: [],
    meta: { schemaVersion: 1, gaps: [] },
  };

  const completeness = computeCompleteness(data);
  return { ...data, meta: { ...data.meta, gaps: completeness.gaps } };
}

/** Prefer LLM extraction when available; fall back to deterministic mapping. */
export async function extractResumeFromLinkedInPayload(
  payload: unknown,
  profileUrl: string,
): Promise<MasterResume> {
  const fallback = mapLinkedInPayloadToResume(payload, profileUrl);
  if (!hasLlmKey()) return fallback;

  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: masterResumeSchema,
      prompt: `Convert this LinkedIn profile JSON into a structured master resume.
Rules:
- Use provenance "linkedin" on all items.
- Give stable unique ids (li_exp_1, li_edu_1, li_skill_1, …).
- Prefer concrete bullets from descriptions; do not invent employers, dates, or metrics.
- Put the LinkedIn URL in identity.links as { label: "LinkedIn", url: "${profileUrl}" }.
- Leave proficiency unset for skills unless clearly stated.
- Leave references empty unless explicitly present.

LinkedIn JSON:
${JSON.stringify(payload).slice(0, 40000)}`,
    });
    const completeness = computeCompleteness(object);
    return {
      ...object,
      meta: { ...object.meta, schemaVersion: 1, gaps: completeness.gaps },
    };
  } catch {
    return fallback;
  }
}
