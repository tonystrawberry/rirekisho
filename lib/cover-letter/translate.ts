import { generateText } from "ai";
import { z } from "zod";
import { getChatModel, hasLlmKey } from "@/lib/ai/models";
import { localeLanguageName } from "@/lib/resume/locales";

const coverLetterTranslateSchema = z.object({
  subject: z.string(),
  content: z.string(),
});

export type CoverLetterTranslatePayload = z.infer<
  typeof coverLetterTranslateSchema
>;

function extractJsonObject(text: string): unknown {
  const raw = text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

function demoTranslate(
  payload: CoverLetterTranslatePayload,
  locale: string,
): CoverLetterTranslatePayload {
  const tag =
    locale === "ja" ? "[JA] " : locale === "fr" ? "[FR] " : "[EN] ";
  return {
    subject: payload.subject ? `${tag}${payload.subject}` : "",
    content: payload.content
      ? `${tag}${payload.content}`
      : payload.content,
  };
}

export async function translateCoverLetterText(
  payload: CoverLetterTranslatePayload,
  locale: string,
): Promise<CoverLetterTranslatePayload> {
  if (locale === "en") return payload;

  if (!hasLlmKey()) {
    return demoTranslate(payload, locale);
  }

  const language = localeLanguageName(locale);
  const { text } = await generateText({
    model: getChatModel(),
    prompt: `You are a professional cover letter translator. Translate the following cover letter into ${language}.

Rules:
- Return ONLY a JSON object with keys "subject" and "content".
- Preserve markdown structure in content (headings, bold, lists, paragraphs).
- Do not invent new facts or credentials.
- Keep proper names (people, companies) unchanged unless a natural local form exists.
- Translate the subject line as a natural letter subject / objet / 件名.

Source JSON:
${JSON.stringify(payload)}`,
  });

  return coverLetterTranslateSchema.parse(extractJsonObject(text));
}
