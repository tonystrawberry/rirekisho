import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { MasterResume } from "@/lib/resume/schema";
import type { TemplateId } from "@/lib/resume/templates";
import { ClassicDocument } from "@/templates/classic/document";
import { ModernDocument } from "@/templates/modern/document";
import { resolveImageSrcForPdf } from "@/lib/resume/photo";

export async function renderResumePdf(
  data: MasterResume,
  templateId: TemplateId,
  locale = "en",
): Promise<Buffer> {
  const photoSrc = resolveImageSrcForPdf(data.identity.photoUrl);
  const logoSrcById: Record<string, string> = {};
  for (const exp of data.experience) {
    const src = resolveImageSrcForPdf(exp.logoUrl);
    // react-pdf Image is unreliable with SVG; skip svg for PDF
    if (src && !exp.logoUrl?.endsWith(".svg")) logoSrcById[exp.id] = src;
  }
  for (const ed of data.education) {
    const src = resolveImageSrcForPdf(ed.logoUrl);
    if (src && !ed.logoUrl?.endsWith(".svg")) logoSrcById[ed.id] = src;
  }
  for (const project of data.projects) {
    const src = resolveImageSrcForPdf(project.logoUrl);
    if (src && !project.logoUrl?.endsWith(".svg")) {
      logoSrcById[project.id] = src;
    }
  }

  const doc =
    templateId === "modern" ? (
      <ModernDocument
        data={data}
        locale={locale}
        photoSrc={photoSrc}
        logoSrcById={logoSrcById}
      />
    ) : (
      <ClassicDocument
        data={data}
        locale={locale}
        photoSrc={photoSrc}
        logoSrcById={logoSrcById}
      />
    );
  return renderToBuffer(doc);
}
