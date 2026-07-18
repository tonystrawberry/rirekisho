import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import {
  badRequest,
  notFound,
  unauthorized,
  unprocessable,
} from "@/lib/api-error";
import { getOwnedProfile, profileToResponse, saveMasterResume } from "@/lib/etl/persist";
import { masterResumeSchema } from "@/lib/resume/schema";
import {
  findLogoSectionItem,
  isLogoSection,
  type LogoSection,
} from "@/lib/resume/logo-sections";

const MAX_BYTES = 1 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function safeItemId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const form = await req.formData();
  const profileId = String(form.get("profileId") || "");
  const section = String(form.get("section") || "");
  const itemId = String(form.get("itemId") || "");
  const file = form.get("logo");

  if (!profileId) return badRequest("profileId is required");
  if (!isLogoSection(section)) {
    return badRequest(
      "section must be experience, education, certifications, or projects",
    );
  }
  if (!itemId) return badRequest("itemId is required");
  if (!(file instanceof File)) return badRequest("logo file is required");
  if (!ALLOWED.has(file.type)) {
    return badRequest("Only JPEG, PNG, WebP, or SVG logos are allowed");
  }
  if (file.size > MAX_BYTES) {
    return unprocessable("Logo must be 1MB or smaller");
  }

  const profile = await getOwnedProfile(session.user.id, profileId);
  if (!profile) return notFound("Resume not found");

  const data = masterResumeSchema.parse(profile.data);
  const item = findLogoSectionItem(data, section as LogoSection, itemId);
  if (!item) return notFound("Item not found on profile");

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : "jpg";

  const dir = path.join(process.cwd(), "public", "uploads", "logos", profile.id);
  await fs.mkdir(dir, { recursive: true });
  const base = `${section}_${safeItemId(itemId)}`;
  for (const other of ["jpg", "png", "webp", "svg"]) {
    await fs.unlink(path.join(dir, `${base}.${other}`)).catch(() => undefined);
  }
  const filename = `${base}.${ext}`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const logoUrl = `/uploads/logos/${profile.id}/${filename}`;
  item.logoUrl = logoUrl;

  const updated = await saveMasterResume({ profileId: profile.id, data });
  return NextResponse.json({
    profile: profileToResponse(updated),
    logoUrl: `${logoUrl}?v=${Date.now()}`,
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId") || "";
  const section = searchParams.get("section") || "";
  const itemId = searchParams.get("itemId") || "";
  if (!profileId) return badRequest("profileId is required");
  if (!isLogoSection(section)) {
    return badRequest(
      "section must be experience, education, certifications, or projects",
    );
  }
  if (!itemId) return badRequest("itemId is required");

  const profile = await getOwnedProfile(session.user.id, profileId);
  if (!profile) return notFound("Resume not found");

  const data = masterResumeSchema.parse(profile.data);
  const item = findLogoSectionItem(data, section as LogoSection, itemId);
  if (!item) return notFound("Item not found on profile");

  const dir = path.join(process.cwd(), "public", "uploads", "logos", profile.id);
  const base = `${section}_${safeItemId(itemId)}`;
  for (const ext of ["jpg", "png", "webp", "svg"]) {
    await fs.unlink(path.join(dir, `${base}.${ext}`)).catch(() => undefined);
  }
  delete item.logoUrl;

  const updated = await saveMasterResume({ profileId: profile.id, data });
  return NextResponse.json({ profile: profileToResponse(updated) });
}
