import { describe, expect, it } from "vitest";
import {
  alignLocaleToSource,
  applyTranslatedDelta,
  applyTranslatedText,
  buildTranslateDelta,
  hasTranslatableDelta,
  toTranslateTextPayload,
} from "@/lib/ai/translate";
import type { MasterResume } from "@/lib/resume/schema";

const sample: MasterResume = {
  identity: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    location: "Berlin",
    photoUrl: "/uploads/user/photo.png",
    links: [{ label: "GitHub", url: "https://github.com/jane" }],
  },
  summary: "Engineer",
  experience: [
    {
      id: "exp1",
      company: "Acme",
      title: "Engineer",
      bullets: ["Built APIs"],
      metrics: [],
      logoUrl: "/uploads/logos/exp1.png",
      provenance: "user",
    },
  ],
  education: [
    {
      id: "edu1",
      institution: "TU",
      degree: "B.Sc.",
      field: "CS",
      logoUrl: "/uploads/logos/edu1.png",
      provenance: "user",
    },
  ],
  skills: [
    {
      id: "sk1",
      name: "TypeScript",
      proficiency: "everyday_work",
      provenance: "user",
    },
  ],
  projects: [
    {
      id: "pr1",
      name: "App",
      description: "Cool app",
      url: "https://example.com",
      highlights: ["Shipped"],
      technologies: ["Rails"],
      provenance: "user",
    },
  ],
  certifications: [
    {
      id: "cert1",
      name: "AWS SAP",
      issuer: "Amazon",
      logoUrl: "/uploads/logos/cert1.png",
      provenance: "user",
    },
  ],
  references: [
    {
      id: "ref1",
      name: "Alex Manager",
      role: "Engineering Manager",
      company: "Acme",
      email: "alex@acme.com",
      provenance: "user",
    },
  ],
  hobbies: [
    {
      id: "hobby1",
      name: "Photography",
      description: "Street and travel",
      provenance: "user",
    },
  ],
  meta: { schemaVersion: 1, gaps: [] },
};

describe("translate text payload", () => {
  it("omits photo and logo URLs from the LLM payload", () => {
    const payload = toTranslateTextPayload(sample);
    const json = JSON.stringify(payload);
    expect(json).not.toContain("/uploads/");
    expect(json).not.toContain("photoUrl");
    expect(json).not.toContain("logoUrl");
    expect(json).not.toContain("jane@example.com");
    expect(json).not.toContain("alex@acme.com");
    expect(payload.identity.fullName).toBe("Jane Doe");
    expect(payload.experience[0].id).toBe("exp1");
    expect(payload.references[0].name).toBe("Alex Manager");
    expect(payload.references[0]).not.toHaveProperty("email");
    expect(payload.hobbies[0].name).toBe("Photography");
  });

  it("re-applies translated text without losing media URLs", () => {
    const payload = toTranslateTextPayload(sample);
    const translated = {
      ...payload,
      summary: "エンジニア",
      experience: [
        {
          ...payload.experience[0],
          title: "エンジニア",
          bullets: ["APIを構築"],
        },
      ],
      references: [
        {
          ...payload.references[0],
          role: "エンジニアリングマネージャー",
        },
      ],
      hobbies: [
        {
          ...payload.hobbies[0],
          name: "写真",
          description: "ストリートと旅行",
        },
      ],
    };
    const merged = applyTranslatedText(sample, translated);
    expect(merged.summary).toBe("エンジニア");
    expect(merged.experience[0].title).toBe("エンジニア");
    expect(merged.identity.photoUrl).toBe("/uploads/user/photo.png");
    expect(merged.experience[0].logoUrl).toBe("/uploads/logos/exp1.png");
    expect(merged.identity.email).toBe("jane@example.com");
    expect(merged.projects[0].url).toBe("https://example.com");
    expect(merged.references[0].role).toBe("エンジニアリングマネージャー");
    expect(merged.references[0].email).toBe("alex@acme.com");
    expect(merged.hobbies[0].name).toBe("写真");
    expect(merged.hobbies[0].description).toBe("ストリートと旅行");
  });

  it("keeps source summary when the model returns an empty summary", () => {
    const payload = toTranslateTextPayload(sample);
    const merged = applyTranslatedText(sample, {
      ...payload,
      summary: "",
    });
    expect(merged.summary).toBe("Engineer");
  });
});

describe("translate delta", () => {
  it("includes only changed text fields", () => {
    const after: MasterResume = {
      ...sample,
      summary: "Senior engineer",
      experience: [
        {
          ...sample.experience[0],
          bullets: ["Built APIs", "Led migrations"],
        },
      ],
    };
    const delta = buildTranslateDelta(sample, after);
    expect(delta.summary).toBe("Senior engineer");
    expect(delta.experience).toHaveLength(1);
    expect(delta.experience?.[0].bullets).toEqual([
      "Built APIs",
      "Led migrations",
    ]);
    expect(delta.education).toBeUndefined();
    expect(delta.skills).toBeUndefined();
    expect(delta.hobbies).toBeUndefined();
    expect(hasTranslatableDelta(delta)).toBe(true);
  });

  it("is empty for non-text changes like proficiency or logo", () => {
    const after: MasterResume = {
      ...sample,
      skills: [
        {
          ...sample.skills[0],
          proficiency: "occasional",
        },
      ],
      experience: [
        {
          ...sample.experience[0],
          logoUrl: "/uploads/logos/new.png",
          startDate: "2020-01",
        },
      ],
    };
    const delta = buildTranslateDelta(sample, after);
    expect(hasTranslatableDelta(delta)).toBe(false);
  });

  it("merges a delta into an existing locale without rewriting other sections", () => {
    const locale: MasterResume = {
      ...sample,
      summary: "エンジニア",
      experience: [
        {
          ...sample.experience[0],
          title: "エンジニア",
          bullets: ["APIを構築"],
        },
      ],
      hobbies: [
        {
          ...sample.hobbies![0],
          name: "写真",
          description: "ストリートと旅行",
        },
      ],
    };
    const afterSource: MasterResume = {
      ...sample,
      summary: "Senior engineer",
    };
    const aligned = alignLocaleToSource(locale, afterSource);
    const merged = applyTranslatedDelta(aligned, {
      summary: "シニアエンジニア",
    });
    expect(merged.summary).toBe("シニアエンジニア");
    expect(merged.experience[0].title).toBe("エンジニア");
    expect(merged.experience[0].bullets).toEqual(["APIを構築"]);
    expect(merged.hobbies?.[0].name).toBe("写真");
    expect(merged.identity.photoUrl).toBe("/uploads/user/photo.png");
  });
});
