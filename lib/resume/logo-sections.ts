import type { MasterResume } from "@/lib/resume/schema";

export type LogoSection =
  | "experience"
  | "education"
  | "certifications"
  | "projects";

export function isLogoSection(value: string): value is LogoSection {
  return (
    value === "experience" ||
    value === "education" ||
    value === "certifications" ||
    value === "projects"
  );
}

type WithLogo = { id: string; logoUrl?: string };

export function getLogoSectionItems(
  data: MasterResume,
  section: LogoSection,
): WithLogo[] {
  if (section === "experience") return data.experience;
  if (section === "education") return data.education;
  if (section === "projects") return data.projects;
  return data.certifications ?? [];
}

export function findLogoSectionItem(
  data: MasterResume,
  section: LogoSection,
  itemId: string,
): WithLogo | undefined {
  return getLogoSectionItems(data, section).find((x) => x.id === itemId);
}
