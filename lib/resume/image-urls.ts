import type { MasterResume } from "@/lib/resume/schema";

/** Append a cache-buster so replaced files at the same path refresh in <img>. */
export function withImageCacheBuster(
  url: string | undefined,
  cacheKey: string | number | undefined,
): string | undefined {
  if (!url) return undefined;
  if (cacheKey === undefined || cacheKey === null || cacheKey === "") {
    return url;
  }
  const base = url.split("?")[0] ?? url;
  return `${base}?v=${encodeURIComponent(String(cacheKey))}`;
}

/** Bust photo + logo URLs for on-screen preview after replace uploads. */
export function bustResumeImageUrls(
  data: MasterResume,
  cacheKey: string | number | undefined,
): MasterResume {
  if (cacheKey === undefined || cacheKey === null || cacheKey === "") {
    return data;
  }
  return {
    ...data,
    identity: {
      ...data.identity,
      photoUrl: withImageCacheBuster(data.identity.photoUrl, cacheKey),
    },
    experience: data.experience.map((e) => ({
      ...e,
      logoUrl: withImageCacheBuster(e.logoUrl, cacheKey),
    })),
    education: data.education.map((e) => ({
      ...e,
      logoUrl: withImageCacheBuster(e.logoUrl, cacheKey),
    })),
    certifications: (data.certifications ?? []).map((c) => ({
      ...c,
      logoUrl: withImageCacheBuster(c.logoUrl, cacheKey),
    })),
    projects: data.projects.map((p) => ({
      ...p,
      logoUrl: withImageCacheBuster(p.logoUrl, cacheKey),
    })),
  };
}
