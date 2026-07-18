import { describe, expect, it } from "vitest";
import {
  groupSkillsByCategory,
  localizeSkillCategories,
  normalizeSkillCategory,
  skillCategoryLabel,
} from "@/lib/resume/skill-categories";

describe("skill categories", () => {
  it("normalizes EN/FR/JA aliases to one canonical id", () => {
    expect(normalizeSkillCategory("Databases & APIs")).toBe(
      "Databases & APIs",
    );
    expect(normalizeSkillCategory("Bases de données & APIs")).toBe(
      "Databases & APIs",
    );
    expect(normalizeSkillCategory("Outils & Environnements")).toBe(
      "Tools & Environments",
    );
    expect(normalizeSkillCategory("Autre")).toBe("Other");
    expect(normalizeSkillCategory("言語・フレームワーク")).toBe(
      "Languages & Frameworks",
    );
  });

  it("merges mixed-language categories when grouping", () => {
    const groups = groupSkillsByCategory(
      [
        {
          id: "1",
          name: "MySQL",
          category: "Databases & APIs",
          provenance: "user",
        },
        {
          id: "2",
          name: "PostgreSQL",
          category: "Bases de données & APIs",
          provenance: "user",
        },
        {
          id: "3",
          name: "Linux",
          category: "Tools & Environments",
          provenance: "user",
        },
        {
          id: "4",
          name: "MacOS",
          category: "Outils & Environnements",
          provenance: "user",
        },
      ],
      "fr",
    );

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.category)).toEqual([
      "Bases de données & APIs",
      "Outils & Environnements",
    ]);
    expect(groups[0].skills.map((s) => s.name)).toEqual([
      "MySQL",
      "PostgreSQL",
    ]);
    expect(groups[1].skills.map((s) => s.name)).toEqual(["Linux", "MacOS"]);
  });

  it("localizes known category labels for a locale", () => {
    const skills = localizeSkillCategories(
      [
        {
          id: "1",
          name: "TypeScript",
          category: "Languages & Frameworks",
          provenance: "user",
        },
        {
          id: "2",
          name: "Design",
          category: "Autre",
          provenance: "user",
        },
      ],
      "fr",
    );
    expect(skills[0].category).toBe("Langages & Frameworks");
    expect(skills[1].category).toBe("Autre");
    expect(skillCategoryLabel("Other", "fr")).toBe("Autre");
  });
});
