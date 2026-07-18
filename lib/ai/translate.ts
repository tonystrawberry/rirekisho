import { generateText } from "ai";
import { z } from "zod";
import { getChatModel, hasLlmKey } from "@/lib/ai/models";
import { localeLanguageName } from "@/lib/resume/locales";
import { localizeSkillCategories } from "@/lib/resume/skill-categories";
import type { MasterResume } from "@/lib/resume/schema";

/** Text-only slice sent to the LLM (no photo/logo URLs, emails, links, meta). */
const translateTextSchema = z.object({
  identity: z.object({
    fullName: z.string(),
    headline: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      title: z.string(),
      location: z.string().optional(),
      bullets: z.array(z.string()),
      metrics: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      degree: z.string().optional(),
      field: z.string().optional(),
      location: z.string().optional(),
      bullets: z.array(z.string()).optional(),
    }),
  ),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string().optional(),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      highlights: z.array(z.string()),
    }),
  ),
  certifications: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      issuer: z.string().optional(),
    }),
  ),
  references: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().optional(),
      company: z.string().optional(),
    }),
  ),
  hobbies: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    }),
  ),
});

export type TranslateTextPayload = z.infer<typeof translateTextSchema>;

/** Partial payload — only sections/items that changed. */
export const translateDeltaSchema = z.object({
  identity: z
    .object({
      fullName: z.string().optional(),
      headline: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  summary: z.string().optional(),
  experience: translateTextSchema.shape.experience.optional(),
  education: translateTextSchema.shape.education.optional(),
  skills: translateTextSchema.shape.skills.optional(),
  projects: translateTextSchema.shape.projects.optional(),
  certifications: translateTextSchema.shape.certifications.optional(),
  references: translateTextSchema.shape.references.optional(),
  hobbies: translateTextSchema.shape.hobbies.optional(),
});

export type TranslateTextDelta = z.infer<typeof translateDeltaSchema>;

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((i) => [i.id, i]));
}

function jsonEq(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Strip media URLs and non-translatable fields before calling the LLM. */
export function toTranslateTextPayload(data: MasterResume): TranslateTextPayload {
  return {
    identity: {
      fullName: data.identity.fullName,
      ...(data.identity.headline ? { headline: data.identity.headline } : {}),
      ...(data.identity.phone ? { phone: data.identity.phone } : {}),
      ...(data.identity.location ? { location: data.identity.location } : {}),
    },
    ...(data.summary ? { summary: data.summary } : {}),
    experience: data.experience.map((e) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      ...(e.location ? { location: e.location } : {}),
      bullets: e.bullets,
      metrics: e.metrics,
    })),
    education: data.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      ...(e.degree ? { degree: e.degree } : {}),
      ...(e.field ? { field: e.field } : {}),
      ...(e.location ? { location: e.location } : {}),
      ...(e.bullets?.length ? { bullets: e.bullets } : {}),
    })),
    skills: data.skills.map((s) => ({
      id: s.id,
      name: s.name,
      ...(s.category ? { category: s.category } : {}),
    })),
    projects: data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      highlights: p.highlights,
    })),
    certifications: (data.certifications ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      ...(c.issuer ? { issuer: c.issuer } : {}),
    })),
    references: (data.references ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      ...(r.role ? { role: r.role } : {}),
      ...(r.company ? { company: r.company } : {}),
    })),
    hobbies: (data.hobbies ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      ...(h.description ? { description: h.description } : {}),
    })),
  };
}

/**
 * Diff two master resumes into a minimal text payload for the LLM.
 * Non-text changes (dates, logos, emails, proficiency) produce an empty delta.
 */
export function buildTranslateDelta(
  before: MasterResume,
  after: MasterResume,
): TranslateTextDelta {
  const beforeText = toTranslateTextPayload(before);
  const afterText = toTranslateTextPayload(after);
  const delta: TranslateTextDelta = {};

  const identity: NonNullable<TranslateTextDelta["identity"]> = {};
  if (beforeText.identity.fullName !== afterText.identity.fullName) {
    identity.fullName = afterText.identity.fullName;
  }
  if (beforeText.identity.headline !== afterText.identity.headline) {
    if (afterText.identity.headline) identity.headline = afterText.identity.headline;
    else identity.headline = "";
  }
  if (beforeText.identity.phone !== afterText.identity.phone) {
    if (afterText.identity.phone) identity.phone = afterText.identity.phone;
    else identity.phone = "";
  }
  if (beforeText.identity.location !== afterText.identity.location) {
    if (afterText.identity.location) identity.location = afterText.identity.location;
    else identity.location = "";
  }
  if (Object.keys(identity).length) delta.identity = identity;

  if ((beforeText.summary ?? "") !== (afterText.summary ?? "")) {
    delta.summary = afterText.summary ?? "";
  }

  const prevExp = byId(beforeText.experience);
  const changedExp = afterText.experience.filter((e) => {
    const prev = prevExp.get(e.id);
    return !prev || !jsonEq(prev, e);
  });
  if (changedExp.length) delta.experience = changedExp;

  const prevEdu = byId(beforeText.education);
  const changedEdu = afterText.education.filter((e) => {
    const prev = prevEdu.get(e.id);
    return !prev || !jsonEq(prev, e);
  });
  if (changedEdu.length) delta.education = changedEdu;

  const prevSkills = byId(beforeText.skills);
  const changedSkills = afterText.skills.filter((s) => {
    const prev = prevSkills.get(s.id);
    return !prev || !jsonEq(prev, s);
  });
  if (changedSkills.length) delta.skills = changedSkills;

  const prevProjects = byId(beforeText.projects);
  const changedProjects = afterText.projects.filter((p) => {
    const prev = prevProjects.get(p.id);
    return !prev || !jsonEq(prev, p);
  });
  if (changedProjects.length) delta.projects = changedProjects;

  const prevCerts = byId(beforeText.certifications);
  const changedCerts = afterText.certifications.filter((c) => {
    const prev = prevCerts.get(c.id);
    return !prev || !jsonEq(prev, c);
  });
  if (changedCerts.length) delta.certifications = changedCerts;

  const prevRefs = byId(beforeText.references);
  const changedRefs = afterText.references.filter((r) => {
    const prev = prevRefs.get(r.id);
    return !prev || !jsonEq(prev, r);
  });
  if (changedRefs.length) delta.references = changedRefs;

  const prevHobbies = byId(beforeText.hobbies);
  const changedHobbies = afterText.hobbies.filter((h) => {
    const prev = prevHobbies.get(h.id);
    return !prev || !jsonEq(prev, h);
  });
  if (changedHobbies.length) delta.hobbies = changedHobbies;

  return delta;
}

export function hasTranslatableDelta(delta: TranslateTextDelta): boolean {
  if (delta.identity && Object.keys(delta.identity).length) return true;
  if (delta.summary !== undefined) return true;
  if (delta.experience?.length) return true;
  if (delta.education?.length) return true;
  if (delta.skills?.length) return true;
  if (delta.projects?.length) return true;
  if (delta.certifications?.length) return true;
  if (delta.references?.length) return true;
  if (delta.hobbies?.length) return true;
  return false;
}

/**
 * Keep translated text from the locale copy where possible, but take structure
 * and non-text fields (dates, logos, emails, proficiency) from the source.
 */
export function alignLocaleToSource(
  locale: MasterResume,
  source: MasterResume,
): MasterResume {
  const locExp = byId(locale.experience);
  const locEdu = byId(locale.education);
  const locSkills = byId(locale.skills);
  const locProjects = byId(locale.projects);
  const locCerts = byId(locale.certifications ?? []);
  const locRefs = byId(locale.references ?? []);
  const locHobbies = byId(locale.hobbies ?? []);

  return {
    ...source,
    identity: {
      ...source.identity,
      fullName: locale.identity.fullName || source.identity.fullName,
      headline: locale.identity.headline ?? source.identity.headline,
      phone: locale.identity.phone ?? source.identity.phone,
      location: locale.identity.location ?? source.identity.location,
    },
    summary: source.summary?.trim()
      ? locale.summary?.trim()
        ? locale.summary
        : source.summary
      : source.summary,
    experience: source.experience.map((e) => {
      const l = locExp.get(e.id);
      if (!l) return e;
      return {
        ...e,
        company: l.company,
        title: l.title,
        location: l.location ?? e.location,
        bullets: l.bullets,
        metrics: l.metrics,
      };
    }),
    education: source.education.map((e) => {
      const l = locEdu.get(e.id);
      if (!l) return e;
      return {
        ...e,
        institution: l.institution,
        degree: l.degree ?? e.degree,
        field: l.field ?? e.field,
        location: l.location ?? e.location,
        bullets: l.bullets ?? e.bullets,
      };
    }),
    skills: source.skills.map((s) => {
      const l = locSkills.get(s.id);
      if (!l) return s;
      return {
        ...s,
        name: l.name,
        category: l.category ?? s.category,
      };
    }),
    projects: source.projects.map((p) => {
      const l = locProjects.get(p.id);
      if (!l) return p;
      return {
        ...p,
        name: l.name,
        description: l.description ?? p.description,
        highlights: l.highlights,
      };
    }),
    certifications: (source.certifications ?? []).map((c) => {
      const l = locCerts.get(c.id);
      if (!l) return c;
      return {
        ...c,
        name: l.name,
        issuer: l.issuer ?? c.issuer,
      };
    }),
    references: (source.references ?? []).map((r) => {
      const l = locRefs.get(r.id);
      if (!l) return r;
      return {
        ...r,
        name: l.name,
        role: l.role ?? r.role,
        company: l.company ?? r.company,
      };
    }),
    hobbies: (source.hobbies ?? []).map((h) => {
      const l = locHobbies.get(h.id);
      if (!l) return h;
      return {
        ...h,
        name: l.name,
        description: l.description ?? h.description,
      };
    }),
  };
}

/** Overlay a translated delta onto an already-aligned locale resume. */
export function applyTranslatedDelta(
  locale: MasterResume,
  translated: TranslateTextDelta,
): MasterResume {
  let next = locale;

  if (translated.identity) {
    next = {
      ...next,
      identity: {
        ...next.identity,
        ...(translated.identity.fullName !== undefined
          ? {
              fullName:
                translated.identity.fullName.trim() || next.identity.fullName,
            }
          : {}),
        ...(translated.identity.headline !== undefined
          ? {
              headline: translated.identity.headline.trim()
                ? translated.identity.headline
                : undefined,
            }
          : {}),
        ...(translated.identity.phone !== undefined
          ? {
              phone: translated.identity.phone.trim()
                ? translated.identity.phone
                : undefined,
            }
          : {}),
        ...(translated.identity.location !== undefined
          ? {
              location: translated.identity.location.trim()
                ? translated.identity.location
                : undefined,
            }
          : {}),
      },
    };
  }

  if (translated.summary !== undefined) {
    next = {
      ...next,
      summary: translated.summary.trim() ? translated.summary : "",
    };
  }

  if (translated.experience?.length) {
    const t = byId(translated.experience);
    next = {
      ...next,
      experience: next.experience.map((e) => {
        const tr = t.get(e.id);
        if (!tr) return e;
        return {
          ...e,
          company: tr.company,
          title: tr.title,
          location: tr.location ?? e.location,
          bullets: tr.bullets,
          metrics: tr.metrics,
        };
      }),
    };
  }

  if (translated.education?.length) {
    const t = byId(translated.education);
    next = {
      ...next,
      education: next.education.map((e) => {
        const tr = t.get(e.id);
        if (!tr) return e;
        return {
          ...e,
          institution: tr.institution,
          degree: tr.degree ?? e.degree,
          field: tr.field ?? e.field,
          location: tr.location ?? e.location,
          bullets: tr.bullets ?? e.bullets,
        };
      }),
    };
  }

  if (translated.skills?.length) {
    const t = byId(translated.skills);
    next = {
      ...next,
      skills: next.skills.map((s) => {
        const tr = t.get(s.id);
        if (!tr) return s;
        return {
          ...s,
          name: tr.name,
          category: tr.category ?? s.category,
        };
      }),
    };
  }

  if (translated.projects?.length) {
    const t = byId(translated.projects);
    next = {
      ...next,
      projects: next.projects.map((p) => {
        const tr = t.get(p.id);
        if (!tr) return p;
        return {
          ...p,
          name: tr.name,
          description: tr.description ?? p.description,
          highlights: tr.highlights,
        };
      }),
    };
  }

  if (translated.certifications?.length) {
    const t = byId(translated.certifications);
    next = {
      ...next,
      certifications: (next.certifications ?? []).map((c) => {
        const tr = t.get(c.id);
        if (!tr) return c;
        return {
          ...c,
          name: tr.name,
          issuer: tr.issuer ?? c.issuer,
        };
      }),
    };
  }

  if (translated.references?.length) {
    const t = byId(translated.references);
    next = {
      ...next,
      references: (next.references ?? []).map((r) => {
        const tr = t.get(r.id);
        if (!tr) return r;
        return {
          ...r,
          name: tr.name,
          role: tr.role ?? r.role,
          company: tr.company ?? r.company,
        };
      }),
    };
  }

  if (translated.hobbies?.length) {
    const t = byId(translated.hobbies);
    next = {
      ...next,
      hobbies: (next.hobbies ?? []).map((h) => {
        const tr = t.get(h.id);
        if (!tr) return h;
        return {
          ...h,
          name: tr.name,
          description: tr.description ?? h.description,
        };
      }),
    };
  }

  return next;
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Model response did not contain JSON");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

/** Apply translated text onto the full source resume (keeps photo/logo URLs, dates, etc.). */
export function applyTranslatedText(
  source: MasterResume,
  translated: TranslateTextPayload,
): MasterResume {
  return applyTranslatedDelta(source, {
    identity: translated.identity,
    // Full translate: never let an empty LLM string wipe the source summary.
    summary: translated.summary?.trim() ? translated.summary : source.summary,
    experience: translated.experience,
    education: translated.education,
    skills: translated.skills,
    projects: translated.projects,
    certifications: translated.certifications,
    references: translated.references,
    hobbies: translated.hobbies,
  });
}

function demoTranslateDelta(
  delta: TranslateTextDelta,
  locale: string,
): TranslateTextDelta {
  const prefix = locale.startsWith("ja")
    ? "【訳】"
    : locale.startsWith("fr")
      ? "[TR] "
      : "";
  if (!prefix) return delta;

  const wrap = (s: string) => (s ? `${prefix}${s}` : s);

  return {
    ...delta,
    ...(delta.identity
      ? {
          identity: {
            ...delta.identity,
            ...(delta.identity.fullName !== undefined
              ? { fullName: wrap(delta.identity.fullName) }
              : {}),
            ...(delta.identity.headline !== undefined
              ? { headline: wrap(delta.identity.headline) }
              : {}),
            ...(delta.identity.location !== undefined
              ? { location: wrap(delta.identity.location) }
              : {}),
          },
        }
      : {}),
    ...(delta.summary !== undefined
      ? {
          summary: delta.summary
            ? locale.startsWith("ja")
              ? `【翻訳デモ】${delta.summary}`
              : `[Démo FR] ${delta.summary}`
            : "",
        }
      : {}),
    ...(delta.experience
      ? {
          experience: delta.experience.map((e) => ({
            ...e,
            company: wrap(e.company),
            title: wrap(e.title),
            ...(e.location ? { location: wrap(e.location) } : {}),
            bullets: e.bullets.map(wrap),
            metrics: e.metrics.map(wrap),
          })),
        }
      : {}),
    ...(delta.education
      ? {
          education: delta.education.map((e) => ({
            ...e,
            institution: wrap(e.institution),
            ...(e.degree ? { degree: wrap(e.degree) } : {}),
            ...(e.field ? { field: wrap(e.field) } : {}),
            ...(e.location ? { location: wrap(e.location) } : {}),
            ...(e.bullets ? { bullets: e.bullets.map(wrap) } : {}),
          })),
        }
      : {}),
    ...(delta.skills
      ? {
          skills: delta.skills.map((s) => ({
            ...s,
            name: wrap(s.name),
            // Keep English category keys; UI localizes labels.
            ...(s.category ? { category: s.category } : {}),
          })),
        }
      : {}),
    ...(delta.projects
      ? {
          projects: delta.projects.map((p) => ({
            ...p,
            name: wrap(p.name),
            ...(p.description ? { description: wrap(p.description) } : {}),
            highlights: p.highlights.map(wrap),
          })),
        }
      : {}),
    ...(delta.certifications
      ? {
          certifications: delta.certifications.map((c) => ({
            ...c,
            name: wrap(c.name),
            ...(c.issuer ? { issuer: wrap(c.issuer) } : {}),
          })),
        }
      : {}),
    ...(delta.references
      ? {
          references: delta.references.map((r) => ({
            ...r,
            name: wrap(r.name),
            ...(r.role ? { role: wrap(r.role) } : {}),
            ...(r.company ? { company: wrap(r.company) } : {}),
          })),
        }
      : {}),
    ...(delta.hobbies
      ? {
          hobbies: delta.hobbies.map((h) => ({
            ...h,
            name: wrap(h.name),
            ...(h.description ? { description: wrap(h.description) } : {}),
          })),
        }
      : {}),
  };
}

/** Translate only the changed fragment and return the same shape. */
export async function translateTextDelta(
  delta: TranslateTextDelta,
  locale: string,
): Promise<TranslateTextDelta> {
  if (locale === "en" || !hasTranslatableDelta(delta)) return delta;

  if (!hasLlmKey()) {
    return demoTranslateDelta(delta, locale);
  }

  const language = localeLanguageName(locale);
  const { text } = await generateText({
    model: getChatModel(),
    prompt: `You are a professional resume translator. Translate the following resume JSON fragment into ${language}.

Rules:
- Return ONLY a JSON object with the same shape and the same "id" values.
- Translate user-facing text only. Keep empty strings empty.
- Keep skill "category" values in English exactly as given. Do not translate category names.
- Do not invent new fields, items, or content.
- Do not add URLs, emails, dates, or image paths.

Fragment JSON:
${JSON.stringify(delta)}`,
  });

  return translateDeltaSchema.parse(extractJsonObject(text));
}

/**
 * Patch an existing locale presentation with a source diff.
 * Returns null when there is nothing to write (caller may still bump version).
 */
export async function applySourceDiffToLocale(params: {
  localeData: MasterResume;
  previousSource: MasterResume;
  nextSource: MasterResume;
  locale: string;
}): Promise<MasterResume> {
  const { localeData, previousSource, nextSource, locale } = params;
  const aligned = alignLocaleToSource(localeData, nextSource);
  const delta = buildTranslateDelta(previousSource, nextSource);
  if (!hasTranslatableDelta(delta)) {
    return withLocalizedSkillCategories(aligned, locale);
  }

  const translated = await translateTextDelta(delta, locale);
  return withLocalizedSkillCategories(
    applyTranslatedDelta(aligned, translated),
    locale,
  );
}

function withLocalizedSkillCategories(
  data: MasterResume,
  locale: string,
): MasterResume {
  return {
    ...data,
    skills: localizeSkillCategories(data.skills, locale),
  };
}

export async function translateMasterResume(
  data: MasterResume,
  locale: string,
): Promise<MasterResume> {
  if (locale === "en") return data;

  const fullDelta = toTranslateTextPayload(data);
  if (!hasLlmKey()) {
    const translated = await translateTextDelta(fullDelta, locale);
    return withLocalizedSkillCategories(
      applyTranslatedDelta(data, translated),
      locale,
    );
  }

  const language = localeLanguageName(locale);
  const textPayload = fullDelta;

  const { text } = await generateText({
    model: getChatModel(),
    prompt: `You are a professional resume translator. Translate the following resume text into ${language}.

Rules:
- Return ONLY a JSON object with the same shape and the same "id" values.
- Translate user-facing text (names of roles/schools when natural, summary, bullets, metrics, skill names, projects, certifications, references role/company/name, hobbies name/description, location).
- Keep skill "category" values in English exactly as given (Languages & Frameworks, Databases & APIs, Cloud & Infrastructure, Tools & Environments, Other, or any custom English category). Do not translate category names.
- Do not invent new fields or content.
- Do not add URLs, emails, dates, or image paths — they are omitted on purpose.

Source JSON:
${JSON.stringify(textPayload)}`,
  });

  const parsed = translateTextSchema.parse(extractJsonObject(text));
  return withLocalizedSkillCategories(
    applyTranslatedText(data, parsed),
    locale,
  );
}
