import type { MasterResume, ResumeGap } from "@/lib/resume/schema";

export type CompletenessResult = {
  score: number;
  gaps: ResumeGap[];
};

export function computeCompleteness(data: MasterResume): CompletenessResult {
  const gaps: ResumeGap[] = [];

  if (!data.identity.fullName || data.identity.fullName === "Your Name") {
    gaps.push({
      section: "identity",
      path: "identity.fullName",
      severity: "critical",
      message: "Add your full name",
    });
  }
  if (!data.identity.email) {
    gaps.push({
      section: "identity",
      path: "identity.email",
      severity: "critical",
      message: "Add a contact email for applications",
    });
  }
  if (!data.identity.headline?.trim()) {
    gaps.push({
      section: "identity",
      path: "identity.headline",
      severity: "medium",
      message: "Add a professional title under your name",
    });
  }
  if (!data.summary || data.summary.trim().length < 40) {
    gaps.push({
      section: "summary",
      path: "summary",
      severity: "high",
      message: "Write a concise professional summary",
    });
  }
  if (data.experience.length === 0) {
    gaps.push({
      section: "experience",
      severity: "high",
      message: "Add at least one work experience entry",
    });
  } else {
    data.experience.forEach((exp, i) => {
      if (!exp.metrics.length) {
        gaps.push({
          section: "experience",
          path: `experience[${i}].metrics`,
          severity: "high",
          message: `Add a measurable outcome for ${exp.title} at ${exp.company}`,
        });
      }
      if (!exp.bullets.length || exp.bullets.every((b) => b.length < 20)) {
        gaps.push({
          section: "experience",
          path: `experience[${i}].bullets`,
          severity: "medium",
          message: `Clarify impact bullets for ${exp.title}`,
        });
      }
    });
  }
  if (data.skills.length < 3) {
    gaps.push({
      section: "skills",
      severity: "medium",
      message: "List at least a few relevant skills",
    });
  } else {
    const missingProficiency = data.skills.filter((s) => !s.proficiency);
    if (missingProficiency.length) {
      gaps.push({
        section: "skills",
        path: "skills.proficiency",
        severity: "medium",
        message: `Add proficiency for: ${missingProficiency
          .slice(0, 4)
          .map((s) => s.name)
          .join(", ")}${missingProficiency.length > 4 ? "…" : ""}`,
      });
    }
  }
  if (data.education.length === 0) {
    gaps.push({
      section: "education",
      severity: "low",
      message: "Consider adding education history",
    });
  }
  if ((data.certifications ?? []).length === 0) {
    gaps.push({
      section: "certifications",
      severity: "low",
      message:
        "Add any certifications (name, issuer, date) — or skip if none",
    });
  }
  if ((data.references ?? []).length === 0) {
    gaps.push({
      section: "references",
      severity: "low",
      message:
        "Add professional references (name, role, company, email) — or skip if none",
    });
  } else {
    const incomplete = (data.references ?? []).filter(
      (r) => !r.email || !r.role,
    );
    if (incomplete.length) {
      gaps.push({
        section: "references",
        path: "references",
        severity: "low",
        message: `Complete role/email for: ${incomplete
          .slice(0, 3)
          .map((r) => r.name)
          .join(", ")}`,
      });
    }
  }
  if ((data.hobbies ?? []).length === 0) {
    gaps.push({
      section: "hobbies",
      severity: "low",
      message: "Add hobbies or interests — or skip if you prefer not to list any",
    });
  }

  const weights: Record<ResumeGap["severity"], number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 4,
  };
  const penalty = gaps.reduce((sum, g) => sum + weights[g.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return { score, gaps };
}

export function hasCriticalGaps(data: MasterResume): boolean {
  return computeCompleteness(data).gaps.some((g) => g.severity === "critical");
}
