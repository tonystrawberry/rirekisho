import type { MasterResume } from "@/lib/resume/schema";

/** Canonical (English) category keys — stored on the source resume. */
export const SKILL_CATEGORY_ORDER = [
  "Languages & Frameworks",
  "Databases & APIs",
  "Cloud & Infrastructure",
  "Tools & Environments",
  "Other",
] as const;

export type SkillCategoryId = (typeof SKILL_CATEGORY_ORDER)[number];
export type SkillItem = MasterResume["skills"][number];

const CATEGORY_LABELS: Record<
  SkillCategoryId,
  Record<"en" | "ja" | "fr", string>
> = {
  "Languages & Frameworks": {
    en: "Languages & Frameworks",
    ja: "言語・フレームワーク",
    fr: "Langages & Frameworks",
  },
  "Databases & APIs": {
    en: "Databases & APIs",
    ja: "データベース・API",
    fr: "Bases de données & APIs",
  },
  "Cloud & Infrastructure": {
    en: "Cloud & Infrastructure",
    ja: "クラウド・インフラ",
    fr: "Cloud & Infrastructure",
  },
  "Tools & Environments": {
    en: "Tools & Environments",
    ja: "ツール・環境",
    fr: "Outils & Environnements",
  },
  Other: {
    en: "Other",
    ja: "その他",
    fr: "Autre",
  },
};

/** Any known spelling (EN/JA/FR) → canonical English id. */
const CATEGORY_ALIASES: Record<string, SkillCategoryId> = (() => {
  const map: Record<string, SkillCategoryId> = {};
  for (const id of SKILL_CATEGORY_ORDER) {
    for (const label of Object.values(CATEGORY_LABELS[id])) {
      map[label.toLowerCase()] = id;
    }
  }
  // Extra FR variants the model often invents
  map["langages et frameworks"] = "Languages & Frameworks";
  map["langages / frameworks"] = "Languages & Frameworks";
  map["bases de données et apis"] = "Databases & APIs";
  map["bases de données & api"] = "Databases & APIs";
  map["cloud et infrastructure"] = "Cloud & Infrastructure";
  map["outils et environnements"] = "Tools & Environments";
  map["autres"] = "Other";
  return map;
})();

function localeKey(locale: string): "en" | "ja" | "fr" {
  if (locale.startsWith("ja")) return "ja";
  if (locale.startsWith("fr")) return "fr";
  return "en";
}

export function isKnownSkillCategory(value: string): value is SkillCategoryId {
  return (SKILL_CATEGORY_ORDER as readonly string[]).includes(value);
}

/** Map any known category spelling to the canonical English id. */
export function normalizeSkillCategory(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Other";
  if (isKnownSkillCategory(trimmed)) return trimmed;
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function skillCategoryLabel(
  categoryOrCanonical: string,
  locale = "en",
): string {
  const canonical = normalizeSkillCategory(categoryOrCanonical);
  if (isKnownSkillCategory(canonical)) {
    return CATEGORY_LABELS[canonical][localeKey(locale)];
  }
  return categoryOrCanonical.trim() || canonical;
}

/** Infer a canonical category when the skill has none set. */
export function inferSkillCategory(name: string): SkillCategoryId {
  const n = name.toLowerCase();

  if (
    /\b(javascript|typescript|python|java|kotlin|swift|go\b|golang|rust|c\+\+|c#|\bc\b|ruby|php|scala|html|css|tailwind|react|next\.?js|vue|angular|svelte|node\.?js|express|rails|django|spring|flutter|react native|android|ios|\.net|lua)\b/.test(
      n,
    )
  ) {
    return "Languages & Frameworks";
  }

  if (
    /\b(postgres|postgresql|mysql|mariadb|mongodb|redis|dynamodb|sqlite|elasticsearch|graphql|rest(ful)?|api|nginx|gradle|prisma|sql|oracle)\b/.test(
      n,
    )
  ) {
    return "Databases & APIs";
  }

  if (
    /\b(aws|amazon|azure|gcp|google cloud|terraform|pulumi|kubernetes|k8s|docker|ecs|eks|lambda|fargate|cloudfront|iam|s3|ec2|vpc|infrastructure|iac|devops|ci\/?cd)\b/.test(
      n,
    )
  ) {
    return "Cloud & Infrastructure";
  }

  if (
    /\b(git|github|gitlab|linux|unix|macos|mac os|bash|shell|docker|jenkins|circleci|github actions|vim|vscode|jira|figma|webpack|vite)\b/.test(
      n,
    )
  ) {
    return "Tools & Environments";
  }

  return "Other";
}

export function skillCategoryKey(skill: SkillItem): string {
  return normalizeSkillCategory(
    skill.category?.trim() || inferSkillCategory(skill.name),
  );
}

/**
 * Rewrite skill.category to the localized label for known categories.
 * Keeps custom categories as-is. Prevents EN/FR duplicate groups after translate.
 */
export function localizeSkillCategories(
  skills: SkillItem[],
  locale: string,
): SkillItem[] {
  return skills.map((s) => {
    const canonical = skillCategoryKey(s);
    if (!isKnownSkillCategory(canonical)) {
      return s.category?.trim()
        ? s
        : { ...s, category: canonical };
    }
    return {
      ...s,
      category: skillCategoryLabel(canonical, locale),
    };
  });
}

/** Group skills by canonical category; `category` is the display label for `locale`. */
export function groupSkillsByCategory(
  skills: SkillItem[],
  locale = "en",
): Array<{ category: string; skills: SkillItem[] }> {
  const groups = new Map<string, SkillItem[]>();
  for (const skill of skills) {
    if (!skill.name?.trim()) continue;
    const key = skillCategoryKey(skill);
    const list = groups.get(key) ?? [];
    list.push(skill);
    groups.set(key, list);
  }

  const ordered: Array<{ category: string; skills: SkillItem[] }> = [];
  const seen = new Set<string>();

  for (const cat of SKILL_CATEGORY_ORDER) {
    const list = groups.get(cat);
    if (!list?.length) continue;
    ordered.push({
      category: skillCategoryLabel(cat, locale),
      skills: list,
    });
    seen.add(cat);
  }

  for (const [cat, list] of groups) {
    if (seen.has(cat) || !list.length) continue;
    ordered.push({
      category: isKnownSkillCategory(cat)
        ? skillCategoryLabel(cat, locale)
        : cat,
      skills: list,
    });
  }

  return ordered;
}

/** Name-only groups for Word / compact PDF lines (labels localized). */
export function groupSkillNamesByCategory(
  skills: SkillItem[],
  locale = "en",
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const { category, skills: items } of groupSkillsByCategory(
    skills,
    locale,
  )) {
    map.set(
      category,
      items.map((s) => s.name.trim()).filter(Boolean),
    );
  }
  return map;
}
