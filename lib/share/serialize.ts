import type { SharedResumeLink, SharedCoverLetterLink } from "@prisma/client";
import { publicSharePath, publicShareUrl } from "@/lib/share/tokens";
import {
  publicCoverLetterSharePath,
  publicCoverLetterShareUrl,
} from "@/lib/cover-letter/share";

export function sharedLinkToResponse(
  link: SharedResumeLink,
  origin?: string,
) {
  return {
    id: link.id,
    token: link.token,
    locale: link.locale,
    templateId: link.templateId,
    primaryColor: link.primaryColor,
    sourceVersion: link.sourceVersion,
    status: link.status,
    label: link.label,
    viewCount: link.viewCount,
    pdfUrl: link.pdfUrl,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null,
    path: publicSharePath(link.token),
    url: publicShareUrl(link.token, origin),
  };
}

export function sharedCoverLetterLinkToResponse(
  link: SharedCoverLetterLink,
  origin?: string,
) {
  return {
    id: link.id,
    token: link.token,
    locale: link.locale,
    templateId: link.templateId,
    primaryColor: link.primaryColor,
    sourceVersion: link.sourceVersion,
    status: link.status,
    label: link.label,
    viewCount: link.viewCount,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null,
    path: publicCoverLetterSharePath(link.token),
    url: publicCoverLetterShareUrl(link.token, origin),
  };
}

export function requestOrigin(req: Request): string | undefined {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto || "http"}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return undefined;
  }
}
