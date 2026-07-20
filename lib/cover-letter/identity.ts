export type CoverLetterIdentity = {
  fullName: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  links?: Array<{ label?: string; url: string }>;
};

export type CoverLetterMeta = {
  companyName?: string | null;
  jobTitle?: string | null;
  letterDate?: string | null;
  recipientName?: string | null;
  recipientTitle?: string | null;
  recipientEmail?: string | null;
  recipientOrganization?: string | null;
  recipientAddress?: string | null;
  subject?: string | null;
};

function parseLinks(raw: unknown): CoverLetterIdentity["links"] {
  if (!Array.isArray(raw)) return undefined;
  const links: Array<{ label?: string; url: string }> = [];
  for (const link of raw) {
    if (!link || typeof link !== "object") continue;
    const item = link as { label?: unknown; url?: unknown };
    if (typeof item.url !== "string" || !item.url.trim()) continue;
    links.push({
      url: item.url,
      ...(typeof item.label === "string" ? { label: item.label } : {}),
    });
  }
  return links.length ? links : undefined;
}

/** Parse a bare identity object (stored on CoverLetter.identity). */
export function normalizeCoverLetterIdentity(
  raw: unknown,
): CoverLetterIdentity | null {
  if (!raw || typeof raw !== "object") return null;
  const identity = raw as Record<string, unknown>;
  const fullName =
    typeof identity.fullName === "string" && identity.fullName.trim()
      ? identity.fullName
      : null;
  if (!fullName) return null;

  return {
    fullName,
    headline:
      typeof identity.headline === "string" ? identity.headline : undefined,
    email: typeof identity.email === "string" ? identity.email : undefined,
    phone: typeof identity.phone === "string" ? identity.phone : undefined,
    location:
      typeof identity.location === "string" ? identity.location : undefined,
    photoUrl:
      typeof identity.photoUrl === "string" ? identity.photoUrl : undefined,
    links: parseLinks(identity.links),
  };
}

/** Parse identity nested under resume `data.identity`. */
export function parseCoverLetterIdentity(data: unknown): CoverLetterIdentity {
  if (!data || typeof data !== "object") {
    return { fullName: "Your Name" };
  }
  const nested = (data as { identity?: unknown }).identity;
  return (
    normalizeCoverLetterIdentity(nested) ?? { fullName: "Your Name" }
  );
}

/** Prefer stored cover-letter identity; else linked resume. */
export function resolveCoverLetterIdentity(
  stored: unknown,
  linkedResumeData: unknown,
): CoverLetterIdentity {
  return (
    normalizeCoverLetterIdentity(stored) ??
    parseCoverLetterIdentity(linkedResumeData)
  );
}
