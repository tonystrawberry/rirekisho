export type CoverLetterTemplateId = "classic" | "modern";

export type CoverLetterTemplateMeta = {
  id: CoverLetterTemplateId;
  name: string;
  description: string;
};

export const COVER_LETTER_TEMPLATES: CoverLetterTemplateMeta[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Header with photo, name, and contact details above the letter",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sidebar layout with recipient, sender, date, and social links",
  },
];

export function isCoverLetterTemplateId(
  value: string,
): value is CoverLetterTemplateId {
  return value === "classic" || value === "modern";
}
