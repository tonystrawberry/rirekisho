/** Resume section headings localized for preview / PDF / Word. */

export type ResumeSectionId =
  | "summary"
  | "profile"
  | "experience"
  | "education"
  | "skills"
  | "technicalSkills"
  | "projects"
  | "certifications"
  | "references"
  | "hobbies";

const SECTION_LABELS: Record<
  ResumeSectionId,
  Record<"en" | "ja" | "fr", string>
> = {
  summary: {
    en: "Summary",
    ja: "概要",
    fr: "Résumé",
  },
  profile: {
    en: "Profile",
    ja: "プロフィール",
    fr: "Profil",
  },
  experience: {
    en: "Experience",
    ja: "職歴",
    fr: "Expérience",
  },
  education: {
    en: "Education",
    ja: "学歴",
    fr: "Formation",
  },
  skills: {
    en: "Skills",
    ja: "スキル",
    fr: "Compétences",
  },
  technicalSkills: {
    en: "Technical Skills",
    ja: "技術スキル",
    fr: "Compétences techniques",
  },
  projects: {
    en: "Projects",
    ja: "プロジェクト",
    fr: "Projets",
  },
  certifications: {
    en: "Certifications",
    ja: "資格",
    fr: "Certifications",
  },
  references: {
    en: "References",
    ja: "推薦者",
    fr: "Références",
  },
  hobbies: {
    en: "Hobbies",
    ja: "趣味",
    fr: "Centres d'intérêt",
  },
};

function localeKey(locale: string): "en" | "ja" | "fr" {
  if (locale.startsWith("ja")) return "ja";
  if (locale.startsWith("fr")) return "fr";
  return "en";
}

export function sectionLabel(
  section: ResumeSectionId,
  locale = "en",
): string {
  return SECTION_LABELS[section][localeKey(locale)];
}
