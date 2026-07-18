"use client";

import type { MasterResume } from "@/lib/resume/schema";
import {
  deleteItemMarker,
} from "@/lib/resume/schema";
import { InlineText } from "@/components/preview/inline-text";
import {
  DeletablePreviewBlock,
  PreviewDeleteButton,
} from "@/components/preview/preview-delete";
import type { ResumePatchFn } from "@/templates/shared/preview-props";

export function ProjectSection({
  projects,
  textEditable = false,
  onPatch,
}: {
  projects: MasterResume["projects"];
  textEditable?: boolean;
  onPatch?: ResumePatchFn;
}) {
  if (!projects.length) return null;

  return (
    <ul className="mt-2 space-y-3 text-sm">
      {projects.map((p) => (
        <DeletablePreviewBlock
          key={p.id}
          as="li"
          canEdit={textEditable}
          label="Remove project"
          onDelete={() =>
            onPatch?.({ projects: [deleteItemMarker(p.id)] })
          }
          className="pr-5"
        >
            <InlineText
              as="p"
              className="font-medium"
              value={p.name}
              editable={textEditable}
              placeholder="Project name"
              onCommit={(name) =>
                onPatch?.({ projects: [{ ...p, name, provenance: "user" }] })
              }
            />
            <InlineText
              as="p"
              multiline
              className="mt-0.5 text-muted"
              value={p.description ?? ""}
              editable={textEditable}
              emptyLabel="Add a description"
              placeholder="Description"
              onCommit={(description) =>
                onPatch?.({
                  projects: [
                    {
                      ...p,
                      description: description || undefined,
                      provenance: "user",
                    },
                  ],
                })
              }
            />
            {p.technologies.length ? (
              <p className="mt-1 text-xs text-muted">
                {p.technologies.join(" · ")}
              </p>
            ) : null}
            {p.highlights.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {p.highlights.map((h, i) => (
                  <li key={i} className="group/bullet">
                    <span className="inline-flex max-w-full items-start gap-1">
                      <InlineText
                        value={h}
                        editable={textEditable}
                        placeholder="Highlight"
                        onCommit={(next) => {
                          const highlights = [...p.highlights];
                          if (!next.trim()) highlights.splice(i, 1);
                          else highlights[i] = next;
                          onPatch?.({
                            projects: [{ ...p, highlights, provenance: "user" }],
                          });
                        }}
                      />
                      {textEditable ? (
                        <PreviewDeleteButton
                          label="Remove highlight"
                          className="mt-0.5 opacity-0 group-hover/bullet:opacity-100 focus-visible:opacity-100"
                          onDelete={() => {
                            const highlights = p.highlights.filter(
                              (_, idx) => idx !== i,
                            );
                            onPatch?.({
                              projects: [
                                { ...p, highlights, provenance: "user" },
                              ],
                            });
                          }}
                        />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
        </DeletablePreviewBlock>
      ))}
    </ul>
  );
}
