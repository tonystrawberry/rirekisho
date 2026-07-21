import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getChatModel, hasLlmKey } from "@/lib/ai/models";

const MAX_HTML_BYTES = 1_500_000;
/** Max cleaned page text kept after HTML strip (and what we persist). */
const MAX_TEXT_CHARS = 100_000;
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Structured extract of the full posting. Fields are optional so partial
 * pages still parse; `fullPosting` must carry the complete substantive text.
 */
const extractedJobSchema = z.object({
  roleTitle: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  employmentType: z
    .string()
    .optional()
    .describe("Full-time, part-time, contract, internship, etc."),
  compensation: z
    .string()
    .optional()
    .describe("Salary, equity, bonus, or pay range if stated"),
  summary: z.string().optional().describe("Overview of the role if present"),
  responsibilities: z
    .string()
    .optional()
    .describe("Responsibilities / what you will do"),
  requirements: z
    .string()
    .optional()
    .describe("Required skills, experience, education"),
  niceToHave: z.string().optional(),
  benefits: z.string().optional().describe("Benefits, perks, culture notes"),
  applicationInstructions: z
    .string()
    .optional()
    .describe("How to apply, deadlines, contacts"),
  otherDetails: z
    .string()
    .optional()
    .describe("Any other substantive posting content not covered above"),
  fullPosting: z
    .string()
    .describe(
      "Complete job posting body with ALL substantive sections preserved verbatim (role, company, location, pay, responsibilities, requirements, nice-to-haves, benefits, EEO, apply instructions, and anything else). Do not summarize or omit content. Omit only site chrome.",
    ),
});

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  // IPv4 private / link-local / metadata
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b != null && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export function normalizeJobUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isBlockedHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; RirekishoBot/1.0; +https://rirekisho.app)",
      },
    });
    if (!res.ok) {
      throw new Error(`Job page returned ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (
      contentType &&
      !/text\/html|application\/xhtml|text\/plain/i.test(contentType)
    ) {
      throw new Error("Job URL is not an HTML page");
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error("Job page is too large to parse");
    }
    const html = new TextDecoder("utf-8").decode(buf);
    const text = htmlToText(html);
    if (text.length < 80) {
      throw new Error("Could not extract readable text from job page");
    }
    return text.slice(0, MAX_TEXT_CHARS);
  } finally {
    clearTimeout(timer);
  }
}

function formatExtracted(
  extracted: z.infer<typeof extractedJobSchema>,
): string {
  // Prefer the complete body so nothing is lost to summarization.
  // Short metadata header aids scanning; section fields fill gaps if
  // fullPosting is empty (model quirk / partial extract).
  const header = [
    extracted.roleTitle ? `Role: ${extracted.roleTitle}` : null,
    extracted.company ? `Company: ${extracted.company}` : null,
    extracted.location ? `Location: ${extracted.location}` : null,
    extracted.employmentType
      ? `Employment type: ${extracted.employmentType}`
      : null,
    extracted.compensation ? `Compensation:\n${extracted.compensation}` : null,
  ].filter(Boolean);

  const full = extracted.fullPosting?.trim();
  if (full) {
    return [...header, `Full posting:\n${full}`]
      .join("\n\n")
      .slice(0, MAX_TEXT_CHARS);
  }

  const parts = [
    ...header,
    extracted.summary ? `Summary:\n${extracted.summary}` : null,
    extracted.responsibilities
      ? `Responsibilities:\n${extracted.responsibilities}`
      : null,
    extracted.requirements ? `Requirements:\n${extracted.requirements}` : null,
    extracted.niceToHave ? `Nice to have:\n${extracted.niceToHave}` : null,
    extracted.benefits ? `Benefits:\n${extracted.benefits}` : null,
    extracted.applicationInstructions
      ? `How to apply:\n${extracted.applicationInstructions}`
      : null,
    extracted.otherDetails ? `Other details:\n${extracted.otherDetails}` : null,
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, MAX_TEXT_CHARS);
}

async function parseJobPostingText(pageText: string): Promise<string> {
  if (!hasLlmKey()) {
    return pageText.slice(0, MAX_TEXT_CHARS);
  }
  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: extractedJobSchema,
      prompt: `Extract the COMPLETE job posting from this web page text.
Ignore navigation, cookie banners, login walls, ads, and unrelated footers.
Preserve ALL substantive content — do not summarize, shorten, or drop sections
(compensation, benefits, requirements, responsibilities, EEO, apply steps, etc.).
Fill every schema field that appears in the page. Put the full posting body in
fullPosting. Do not invent facts.

PAGE TEXT:
${pageText}`,
    });
    const formatted = formatExtracted(object);
    return formatted || pageText.slice(0, MAX_TEXT_CHARS);
  } catch {
    return pageText.slice(0, MAX_TEXT_CHARS);
  }
}

/**
 * Fetch + AI-parse jobUrl once per URL and persist on the application.
 * No-ops when already parsed for the current URL. Failures leave cache empty
 * so a later attempt can retry.
 */
export async function ensureJobPostingParsed(applicationId: string): Promise<{
  jobPostingText: string | null;
  parsed: boolean;
  error?: string;
}> {
  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      jobUrl: true,
      jobPostingText: true,
      jobPostingParsedUrl: true,
    },
  });
  if (!app) {
    return { jobPostingText: null, parsed: false, error: "not_found" };
  }

  const url = app.jobUrl ? normalizeJobUrl(app.jobUrl) : null;
  if (!url) {
    return { jobPostingText: app.jobPostingText, parsed: false };
  }

  if (
    app.jobPostingText &&
    app.jobPostingParsedUrl &&
    app.jobPostingParsedUrl === url
  ) {
    return { jobPostingText: app.jobPostingText, parsed: false };
  }

  try {
    const pageText = await fetchPageText(url);
    const jobPostingText = await parseJobPostingText(pageText);
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        jobPostingText,
        jobPostingParsedUrl: url,
        jobPostingParsedAt: new Date(),
      },
    });
    return { jobPostingText, parsed: true };
  } catch (e) {
    return {
      jobPostingText: app.jobPostingText,
      parsed: false,
      error: e instanceof Error ? e.message : "parse_failed",
    };
  }
}
