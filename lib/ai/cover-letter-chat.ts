import type { ApplicationContext } from "@/lib/applications/cover-letter";

export type CoverLetterFullSuggestion = {
  kind: "full";
  content: string;
  summary: string;
};

export type CoverLetterPatchSuggestion = {
  kind: "patch";
  find: string;
  replace: string;
  summary: string;
};

export type CoverLetterSuggestion =
  | CoverLetterFullSuggestion
  | CoverLetterPatchSuggestion;

export function buildCoverLetterSystemPrompt(
  ctx: ApplicationContext,
  currentBody = "",
) {
  const resumeSnippet = ctx.linkedResume
    ? truncateJson(ctx.linkedResume.data, 6000)
    : null;
  const hasBody = currentBody.trim().length > 0;

  return `You are a cover letter writing coach helping a job seeker draft and refine a cover letter for a specific application.

The product UI already renders identity (name, photo, email, phone, links), destinataire / recipient block, date, and subject/objet from separate form fields. Your draft is inserted ONLY into the letter body.

Goals:
- Ask clarifying questions when needed, but prefer producing useful draft content quickly.
- Never invent employers, degrees, metrics, or credentials — only use facts from the application context and linked resume below.
- Write letter BODY markdown only (salutation, paragraphs, light emphasis, optional short lists, closing).
- Do not claim the letter was applied — the UI requires the user to confirm before applying.

CRITICAL — body-only content rules:
- Do NOT include sender header (name/email/phone/links), recipient address blocks, or subject/objet lines.
- Do NOT use a top-level markdown heading with the candidate's name.
- Start with salutation, then paragraphs, then a short closing. Signature name is optional.

${
  hasBody
    ? `REFINEMENT MODE (a draft already exists):
- Prefer SMALL edits. When the user asks to refine, rewrite, shorten, strengthen, or change a part, propose a PATCH that changes only the relevant excerpt — never rewrite the whole letter unless they explicitly ask for a full rewrite.
- Put the patch in a fenced code block labeled cover-letter-patch using this exact shape:

\`\`\`cover-letter-patch
FIND:
exact excerpt copied from the current letter body (must match character-for-character, including punctuation and line breaks)

REPLACE:
the improved excerpt only
\`\`\`
Summary: One-line description of what changed.

- FIND must be copied verbatim from the Current letter body below so it can be located and replaced.
- REPLACE should be the same scope as FIND (one paragraph or a few sentences), not the entire letter.
- You may include multiple cover-letter-patch blocks if several independent spots need edits; prefer one patch when possible.
- Only use a full rewrite fence (cover-letter-suggestion) if the user explicitly asks to rewrite the whole letter or start over.`
    : `DRAFT MODE (letter body is empty):
- Propose a full body draft in a fenced code block labeled cover-letter-suggestion:

\`\`\`cover-letter-suggestion
Bonjour,

Je vous écris pour postuler…

Cordialement,
\`\`\`
Summary: Brief description of the draft.`
}

Current letter body:
${hasBody ? currentBody : "(empty)"}

Application (for context only — do not paste as letterhead):
- Title / role: ${ctx.title}
- Company: ${ctx.companyName || "(not provided)"}
- Job URL: ${ctx.jobUrl || "(not provided)"}
- Description:
${ctx.description || "(not provided)"}

Linked resume: ${
    ctx.linkedResume
      ? `${ctx.linkedResume.title} (${ctx.linkedResume.id})`
      : "none — use application metadata and user messages only"
  }
${resumeSnippet ? `\nResume data (truncated):\n${resumeSnippet}` : ""}
`;
}

function truncateJson(value: unknown, maxChars: number): string {
  try {
    const text = JSON.stringify(value, null, 2);
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}\n…(truncated)`;
  } catch {
    return "(unavailable)";
  }
}

function extractSummary(text: string, fenceEndIndex: number): string {
  const after = text.slice(fenceEndIndex);
  const summaryMatch = after.match(/Summary:\s*(.+)/i);
  return summaryMatch?.[1]?.trim() || "Suggested cover letter update";
}

export function extractCoverLetterSuggestion(
  text: string,
): CoverLetterSuggestion | null {
  const patchMatch = text.match(
    /```cover-letter-patch\s*([\s\S]*?)```/i,
  );
  if (patchMatch) {
    const body = patchMatch[1];
    const parts = body.match(
      /FIND:\s*([\s\S]*?)\n\s*REPLACE:\s*([\s\S]*)$/i,
    );
    if (parts) {
      const find = parts[1].trim();
      const replace = parts[2].trim();
      if (find) {
        const fenceEnd =
          (patchMatch.index ?? 0) + patchMatch[0].length;
        return {
          kind: "patch",
          find,
          replace,
          summary: extractSummary(text, fenceEnd),
        };
      }
    }
  }

  const fullMatch = text.match(
    /```cover-letter-suggestion\s*([\s\S]*?)```/i,
  );
  if (!fullMatch) return null;
  const content = fullMatch[1].trim();
  if (!content) return null;
  const fenceEnd = (fullMatch.index ?? 0) + fullMatch[0].length;
  return {
    kind: "full",
    content,
    summary: extractSummary(text, fenceEnd),
  };
}

/** Remove suggestion fences so Reject/Apply stay dismissed after reload. */
export function stripCoverLetterSuggestionFences(text: string): string {
  return text
    .replace(/```cover-letter-patch\s*[\s\S]*?```/gi, "")
    .replace(/```cover-letter-suggestion\s*[\s\S]*?```/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clearLatestSuggestionFromMessages<
  T extends { role: string; content: string },
>(messages: T[]): T[] {
  const next = messages.map((m) => ({ ...m }));
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (
      next[i].role === "assistant" &&
      extractCoverLetterSuggestion(next[i].content)
    ) {
      next[i] = {
        ...next[i],
        content: stripCoverLetterSuggestionFences(next[i].content),
      };
      break;
    }
  }
  return next;
}

/** Apply a find/replace patch to letter body. Returns null if FIND is missing. */
export function applyCoverLetterPatch(
  content: string,
  find: string,
  replace: string,
): string | null {
  if (!find) return null;
  const index = content.indexOf(find);
  if (index < 0) return null;
  return (
    content.slice(0, index) + replace + content.slice(index + find.length)
  );
}

export function offlineCoverLetterReply(
  ctx: ApplicationContext,
  currentBody = "",
): string {
  const company = ctx.companyName || "the company";
  const role = ctx.title;

  if (currentBody.trim()) {
    const paragraphs = currentBody
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const target =
      paragraphs.find((p) => p.length > 40 && !/^dear\b/i.test(p) && !/^bonjour/i.test(p)) ||
      paragraphs[0] ||
      currentBody.trim();
    const refined = `${target}\n\n(I'd sharpen this further with more concrete impact from your experience once we chat.)`;
    return `Here's a small refinement you can confirm:

\`\`\`cover-letter-patch
FIND:
${target}

REPLACE:
${refined}
\`\`\`
Summary: Suggested a light polish on one passage for ${role} at ${company}.`;
  }

  const draft = `Dear Hiring Manager,

I am writing to express my interest in the **${role}** role at **${company}**.

${
  ctx.linkedResume
    ? "Based on my experience, I believe I can contribute meaningfully to your team. Please review and tailor the details below to match your background."
    : "I would welcome the opportunity to discuss how my background aligns with this role. Please share more about your experience so we can refine this draft."
}

Thank you for your consideration.

Sincerely,`;

  return `Here's a starter draft you can confirm and edit (body only):

\`\`\`cover-letter-suggestion
${draft}
\`\`\`
Summary: Starter body draft for ${role} at ${company}.`;
}
