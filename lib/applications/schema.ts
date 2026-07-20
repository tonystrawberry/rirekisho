import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";

const titleSchema = z.string().trim().min(1).max(200);
const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const optionalDate = z
  .string()
  .datetime()
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : null));

export const applicationCreateSchema = z.object({
  title: titleSchema,
  description: optionalString(5000),
  companyName: optionalString(200),
  jobUrl: optionalString(2000),
  status: z.nativeEnum(ApplicationStatus).optional(),
  appliedAt: optionalDate,
  linkedResumeId: z.string().trim().min(1).optional().nullable(),
});

export const applicationUpdateSchema = applicationCreateSchema.partial();

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
