import type { MasterResume } from "@/lib/resume/schema";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import { APP_BRAND_COLOR } from "@/lib/brand";

/** Sample master resume for the marketing hero preview. */
export const DEMO_RESUME: MasterResume = {
  identity: {
    fullName: "Alex Rivera",
    headline: "Senior Software Engineer",
    email: "alex@example.com",
    location: "Tokyo",
    photoUrl: "/brand/demo/alex.svg",
    links: [{ label: "GitHub", url: "https://github.com" }],
  },
  summary:
    "Full-stack engineer who ships product with clarity. Comfortable owning features from chat UX to export pipelines.",
  experience: [
    {
      id: "demo_exp_1",
      company: "Spacely Inc",
      title: "Staff Engineer",
      startDate: "2022-01",
      current: true,
      bullets: [
        "Shipped enrichment chat that proposes resume patches users confirm before apply",
        "Cut PDF and Word export latency 40% across Classic and Modern templates",
      ],
      logoUrl: "/brand/demo/spacely.svg",
      provenance: "user",
    },
    {
      id: "demo_exp_2",
      company: "Northwind",
      title: "Software Engineer",
      startDate: "2019-03",
      endDate: "2021-12",
      bullets: [
        "Built internal hiring tools used by 12 recruiters weekly",
        "Introduced typed APIs that reduced onboarding defects",
      ],
      logoUrl: "/brand/demo/northwind.svg",
      provenance: "user",
    },
  ],
  education: [
    {
      id: "demo_edu_1",
      institution: "Keio University",
      degree: "B.S.",
      field: "Computer Science",
      endDate: "2019",
      logoUrl: "/brand/demo/keio.svg",
      provenance: "user",
    },
  ],
  skills: [
    {
      id: "demo_sk_1",
      name: "TypeScript",
      proficiency: "everyday_work",
      provenance: "user",
    },
    {
      id: "demo_sk_2",
      name: "Next.js",
      proficiency: "everyday_work",
      provenance: "user",
    },
    {
      id: "demo_sk_3",
      name: "PostgreSQL",
      proficiency: "occasional",
      provenance: "user",
    },
  ],
  projects: [],
  certifications: [],
  references: [],
  hobbies: [{ id: "demo_hb_1", name: "Photography", provenance: "user" }],
  meta: { schemaVersion: 1, gaps: [] },
};

export const DEMO_COVER_IDENTITY: CoverLetterIdentity = {
  fullName: DEMO_RESUME.identity.fullName,
  headline: DEMO_RESUME.identity.headline,
  email: DEMO_RESUME.identity.email,
  location: DEMO_RESUME.identity.location,
  photoUrl: DEMO_RESUME.identity.photoUrl,
  links: DEMO_RESUME.identity.links,
};

export const DEMO_COVER_META: CoverLetterMeta = {
  companyName: "Spacely Inc",
  jobTitle: "Staff Engineer",
  letterDate: "2026-07-01",
  recipientName: "Hiring Manager",
  recipientOrganization: "Spacely Inc",
};

export const DEMO_COVER_SUBJECT = "Application — Staff Engineer";

export const DEMO_COVER_CONTENT = `Dear Hiring Manager,

I am writing to express my interest in the Staff Engineer role at Spacely Inc.

At my current role I led an enrichment chat that helps candidates turn achievements into confirmed resume patches, and I care deeply about clear written communication in hiring.

I would welcome the chance to discuss how I can help your team ship thoughtful product experiences.

Sincerely,
Alex Rivera`;

export const DEMO_PRIMARY_COLOR = APP_BRAND_COLOR;
