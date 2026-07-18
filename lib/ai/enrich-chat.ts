import type { MasterResume, ResumeGap } from "@/lib/resume/schema";

function isMostlyEmpty(profile: MasterResume) {
  return (
    profile.experience.length === 0 &&
    profile.education.length === 0 &&
    profile.skills.length === 0 &&
    profile.projects.length === 0 &&
    (!profile.summary || profile.summary.trim().length < 20)
  );
}

export function buildEnrichmentSystemPrompt(
  profile: MasterResume,
  gaps: ResumeGap[],
) {
  const topGaps = gaps.slice(0, 5);
  const empty = isMostlyEmpty(profile);

  return `You are a resume-building coach. The user builds their entire resume through this chat (no LinkedIn/GitHub import).

Goals:
- Ask ONE clear question at a time.
- Never invent employers, dates, degrees, or metrics — only use what the user provides.
- When the user shares concrete information, propose a JSON resume patch in a fenced code block labeled json-patch.
- The patch MUST be a single JSON object with resume section keys (partial master resume), NOT an RFC 6902 ops array.
  Correct example:
  \`\`\`json-patch
  {
    "skills": [
      { "id": "skill_1", "name": "TypeScript", "proficiency": "everyday_work", "provenance": "ai_suggested" }
    ]
  }
  \`\`\`
  Incorrect (do not use): [{"op":"replace","path":"/skills","value":[...]}]
- Only include fields that should change. Use provenance "ai_suggested" on new/changed items until the user clicks Confirm in the UI.
- Give each new experience/education/skill/project/certification/reference/hobby item a stable unique string id (e.g. exp_1, edu_1, cert_1, ref_1, hobby_1).
- For each skill, always capture proficiency using exactly one of:
  "everyday_work" (use every day at work),
  "occasional" (occasionally use it),
  "personal_project" (used for personal projects),
  "once" (used it once).
  Ask about proficiency when adding skills; do not leave proficiency blank if the user stated how often they use it.
- For certifications, capture name, issuer, and date (and optional url) when the user has any.
- For references, capture name, role, company, and email when the user wants to list professional references.
- For hobbies, capture a short name and optional description (e.g. "Photography — street and travel").
- If the user skips, acknowledge and move to the next useful question.
${
  empty
    ? `
The profile is nearly empty. Start by collecting identity (preferred name, professional headline/title shown under the name e.g. "Ruby on Rails Engineer — Spacely Inc", email, location), then walk through work experience one role at a time (title, company, dates, responsibilities, measurable outcomes), then education, skills with proficiency, certifications if any, references if any, hobbies if any, and a short summary. Put the professional title in identity.headline (not experience.title).
`
    : `
Continue filling the highest-priority gaps. Prefer quantified achievements when discussing experience. For skills, prefer name + proficiency pairs. Ask about certifications, references, or hobbies when those gaps are open.
`
}

Current gaps (priority order):
${JSON.stringify(topGaps, null, 2)}

Current master resume (truncated):
${JSON.stringify(
    {
      identity: profile.identity,
      summary: profile.summary,
      experience: profile.experience.slice(0, 6),
      education: profile.education.slice(0, 4),
      skills: profile.skills.slice(0, 16),
      projects: profile.projects.slice(0, 4),
      certifications: (profile.certifications ?? []).slice(0, 8),
      references: (profile.references ?? []).slice(0, 6),
      hobbies: (profile.hobbies ?? []).slice(0, 8),
    },
    null,
    2,
  )}
`;
}

/**
 * Convert RFC 6902-style ops (which models sometimes emit) into a partial
 * master-resume object expected by resumePatchSchema.
 */
export function normalizeResumePatch(
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;

  if (!Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  const out: Record<string, unknown> = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as { op?: string; path?: string; value?: unknown };
    if (
      (item.op !== "replace" && item.op !== "add") ||
      typeof item.path !== "string" ||
      !item.path.startsWith("/")
    ) {
      continue;
    }
    const key = item.path.replace(/^\//, "").split("/")[0];
    if (!key) continue;
    out[key] = item.value;
  }
  return Object.keys(out).length ? out : null;
}

export function extractJsonPatch(text: string): Record<string, unknown> | null {
  const match = text.match(/```json-patch\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    return normalizeResumePatch(JSON.parse(match[1]));
  } catch {
    return null;
  }
}

export function offlineAssistantReply(
  gaps: ResumeGap[],
  options?: { skipCount?: number; emptyProfile?: boolean },
): string {
  if (options?.emptyProfile) {
    return `Let's build your resume from scratch.

What's your **full name** and the **role or field** you're targeting? (You can also share your email and location.)`;
  }

  const skipCount = options?.skipCount ?? 0;
  const gap = gaps[skipCount] ?? gaps[0];
  if (!gap) {
    return "Your resume looks fairly complete. What would you like to improve next—summary, a role bullet, or skills?";
  }
  return `Let's strengthen your resume. ${gap.message}

Share a specific achievement or metric (numbers help). If you'd rather skip, say "skip".`;
}

/** Count trailing user "skip" turns so offline mode advances gaps. */
export function countTrailingSkips(
  messages: Array<{ role: string; content: string }>,
): number {
  let n = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (m.content.trim().toLowerCase() === "skip") n += 1;
    else break;
  }
  return n;
}
