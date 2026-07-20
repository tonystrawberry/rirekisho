import { z } from "zod";
import { isCoverLetterTemplateId } from "@/lib/cover-letter/templates";
import { isValidPrimaryColor } from "@/lib/resume/theme-color";
import { isResumeLocale } from "@/lib/resume/locales";

const optionalTrimmed = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t.length ? t : null;
  });

const identityLinkSchema = z.object({
  label: z.string().max(100).optional(),
  url: z.string().trim().min(1).max(2000),
});

export const coverLetterIdentitySchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  headline: z.string().max(300).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(80).optional(),
  location: z.string().max(300).optional(),
  photoUrl: z.string().max(2000).optional(),
  links: z.array(identityLinkSchema).max(20).optional(),
});

export const coverLetterContentSchema = z
  .object({
    content: z.string().max(50_000).optional(),
    subject: z.string().max(500).optional(),
    templateId: z
      .string()
      .refine(isCoverLetterTemplateId, "Invalid templateId")
      .optional(),
    primaryColor: z
      .string()
      .refine(isValidPrimaryColor, "Invalid primaryColor")
      .optional(),
    locale: z.string().refine(isResumeLocale, "Invalid locale").optional(),
    identity: coverLetterIdentitySchema.optional(),
    recipientName: optionalTrimmed,
    recipientTitle: optionalTrimmed,
    recipientEmail: optionalTrimmed,
    recipientOrganization: optionalTrimmed,
    recipientAddress: z
      .string()
      .max(2000)
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        const t = v.trim();
        return t.length ? t : null;
      }),
  })
  .refine(
    (v) =>
      v.content !== undefined ||
      v.subject !== undefined ||
      v.templateId !== undefined ||
      v.primaryColor !== undefined ||
      v.locale !== undefined ||
      v.identity !== undefined ||
      v.recipientName !== undefined ||
      v.recipientTitle !== undefined ||
      v.recipientEmail !== undefined ||
      v.recipientOrganization !== undefined ||
      v.recipientAddress !== undefined,
    {
      message: "At least one cover letter field is required",
    },
  );

export const coverLetterApplySuggestionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("full"),
    content: z.string().min(1).max(50_000),
    confirmReplace: z.literal(true),
  }),
  z.object({
    mode: z.literal("patch"),
    find: z.string().min(1).max(50_000),
    replace: z.string().max(50_000),
    confirmReplace: z.literal(true),
  }),
]);

export type CoverLetterContentInput = z.infer<typeof coverLetterContentSchema>;
export type CoverLetterApplySuggestionInput = z.infer<
  typeof coverLetterApplySuggestionSchema
>;
