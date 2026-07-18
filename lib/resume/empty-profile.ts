import type { MasterResume } from "@/lib/resume/schema";
import { computeCompleteness } from "@/lib/resume/completeness";

export function createEmptyMasterResume(fullName = "Your Name"): MasterResume {
  const data: MasterResume = {
    identity: { fullName, links: [] },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    references: [],
    hobbies: [],
    meta: {
      schemaVersion: 1,
      gaps: [],
    },
  };
  const completeness = computeCompleteness(data);
  return { ...data, meta: { ...data.meta, gaps: completeness.gaps } };
}

export function createEmptyCompleteness() {
  return computeCompleteness(createEmptyMasterResume());
}
