"use client";

import { ItemLogoUpload } from "@/components/profile/item-logo-upload";
import type { MasterResume } from "@/lib/resume/schema";

export function EntryLogosEditor({
  data,
  onChanged,
}: {
  data: MasterResume;
  onChanged?: () => void;
}) {
  if (
    !data.experience.length &&
    !data.education.length &&
    !data.projects.length
  ) {
    return (
      <p className="text-sm text-muted">
        Add experience, education, or projects first, then attach logos here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.experience.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Experience logos
          </p>
          {data.experience.map((exp) => (
            <ItemLogoUpload
              key={exp.id}
              section="experience"
              itemId={exp.id}
              label={`${exp.title} · ${exp.company}`}
              initialLogoUrl={exp.logoUrl}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : null}
      {data.education.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Education logos
          </p>
          {data.education.map((ed) => (
            <ItemLogoUpload
              key={ed.id}
              section="education"
              itemId={ed.id}
              label={ed.institution}
              initialLogoUrl={ed.logoUrl}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : null}
      {data.projects.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Project logos
          </p>
          {data.projects.map((p) => (
            <ItemLogoUpload
              key={p.id}
              section="projects"
              itemId={p.id}
              label={p.name}
              initialLogoUrl={p.logoUrl}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
