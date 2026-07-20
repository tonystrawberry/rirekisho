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

export function parseCoverLetterIdentity(data: unknown): CoverLetterIdentity {
  if (!data || typeof data !== "object") {
    return { fullName: "Your Name" };
  }
  const identity = (data as { identity?: Record<string, unknown> }).identity;
  if (!identity || typeof identity !== "object") {
    return { fullName: "Your Name" };
  }

  const linksRaw = Array.isArray(identity.links) ? identity.links : [];
  const links: Array<{ label?: string; url: string }> = [];
  for (const link of linksRaw) {
    if (!link || typeof link !== "object") continue;
    const item = link as { label?: unknown; url?: unknown };
    if (typeof item.url !== "string" || !item.url.trim()) continue;
    links.push({
      url: item.url,
      ...(typeof item.label === "string" ? { label: item.label } : {}),
    });
  }

  return {
    fullName:
      typeof identity.fullName === "string" && identity.fullName.trim()
        ? identity.fullName
        : "Your Name",
    headline:
      typeof identity.headline === "string" ? identity.headline : undefined,
    email: typeof identity.email === "string" ? identity.email : undefined,
    phone: typeof identity.phone === "string" ? identity.phone : undefined,
    location:
      typeof identity.location === "string" ? identity.location : undefined,
    photoUrl:
      typeof identity.photoUrl === "string" ? identity.photoUrl : undefined,
    links: links.length ? links : undefined,
  };
}
