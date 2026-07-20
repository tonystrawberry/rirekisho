import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import type { CoverLetterTemplateId } from "@/lib/cover-letter/templates";

export type CoverLetterShareSnapshot = {
  content: string;
  subject: string;
  templateId: CoverLetterTemplateId;
  primaryColor: string;
  locale: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
};

export function publicCoverLetterSharePath(token: string): string {
  return `/cl/${token}`;
}

export function publicCoverLetterShareUrl(
  token: string,
  origin?: string,
): string {
  const path = publicCoverLetterSharePath(token);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof process.env.AUTH_URL === "string" && process.env.AUTH_URL) {
    return `${process.env.AUTH_URL.replace(/\/$/, "")}${path}`;
  }
  if (typeof process.env.NEXTAUTH_URL === "string" && process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}${path}`;
  }
  return path;
}
