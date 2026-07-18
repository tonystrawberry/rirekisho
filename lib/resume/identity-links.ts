export type IdentityLink = { label: string; url: string };

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Display host/path without protocol for compact header lines. */
export function formatLinkDisplay(link: IdentityLink): string {
  const label = link.label?.trim();
  if (label && label.toLowerCase() !== "website") return label;
  try {
    const u = new URL(normalizeWebsiteUrl(link.url) || link.url);
    return `${u.host}${u.pathname === "/" ? "" : u.pathname}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return link.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

/** Flat list for PDF / print-style meta lines. */
export function formatIdentityLinksForMeta(
  links: IdentityLink[] | undefined,
): string[] {
  return (links ?? [])
    .map((link) => formatLinkDisplay(link))
    .filter(Boolean);
}
