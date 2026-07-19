"use client";

import { TEMPLATES, type TemplateId } from "@/lib/resume/templates";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function TemplateSwitcher({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <SegmentedControl
      aria-label="Template"
      value={value}
      options={TEMPLATES.map((t) => ({ id: t.id, label: t.name }))}
      onChange={onChange}
    />
  );
}
