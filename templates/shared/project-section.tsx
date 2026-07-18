"use client";

import type { MasterResume } from "@/lib/resume/schema";
import { deleteItemMarker } from "@/lib/resume/schema";
import { EntryLogoSlot } from "@/components/profile/entry-logo-slot";
import { InlineText } from "@/components/preview/inline-text";
import {
  DeletablePreviewBlock,
  PreviewDeleteButton,
} from "@/components/preview/preview-delete";
import type { ResumePatchFn } from "@/templates/shared/preview-props";

type ProjectItem = MasterResume["projects"][number];

function emptyProject(name: string): ProjectItem {
  return {
    id: `proj_${Date.now()}`,
    name,
    description: undefined,
    url: undefined,
    highlights: [],
    technologies: [],
    provenance: "user",
  };
}

export function ProjectSection({
  projects,
  profileId,
  editable = false,
  textEditable = false,
  onPatch,
  onMediaChanged,
}: {
  projects: MasterResume["projects"];
  profileId?: string;
  /** Photo / logo uploads */
  editable?: boolean;
  textEditable?: boolean;
  onPatch?: ResumePatchFn;
  onMediaChanged?: () => void;
}) {
  function addProject(nameRaw: string) {
    const name = nameRaw.trim();
    if (!name) return;
    onPatch?.({ projects: [emptyProject(name)] });
  }

  if (!projects.length && !textEditable) {
    return null;
  }

  return (
    <div className="mt-2">
      {projects.length ? (
        <ul className="space-y-3 text-sm">
          {projects.map((p) => (
            <DeletablePreviewBlock
              key={p.id}
              as="li"
              canEdit={textEditable}
              label="Remove project"
              onDelete={() =>
                onPatch?.({ projects: [deleteItemMarker(p.id)] })
              }
              className="flex gap-3 pr-5"
            >
              <div data-resume-block className="flex w-full gap-3">
                <EntryLogoSlot
                  profileId={profileId}
                  section="projects"
                  itemId={p.id}
                  initialLogoUrl={p.logoUrl}
                  editable={editable}
                  onChanged={() => onMediaChanged?.()}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <InlineText
                    as="p"
                    className="font-medium"
                    value={p.name}
                    editable={textEditable}
                    placeholder="Project name"
                    onCommit={(name) =>
                      onPatch?.({
                        projects: [{ ...p, name, provenance: "user" }],
                      })
                    }
                  />
                  {(p.url || textEditable) && (
                    <InlineText
                      as="p"
                      className="mt-0.5 text-xs text-muted"
                      value={p.url ?? ""}
                      editable={textEditable}
                      emptyLabel="+ add link"
                      placeholder="https://…"
                      onCommit={(url) =>
                        onPatch?.({
                          projects: [
                            {
                              ...p,
                              url: url.trim() || undefined,
                              provenance: "user",
                            },
                          ],
                        })
                      }
                    />
                  )}
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
                  {(p.technologies.length || textEditable) && (
                    <InlineText
                      as="p"
                      className="mt-1 text-xs text-muted"
                      value={p.technologies.join(" · ")}
                      editable={textEditable}
                      emptyLabel="+ add technologies"
                      placeholder="React · Node.js"
                      onCommit={(raw) => {
                        const technologies = raw
                          .split(/[·|,]/)
                          .map((t) => t.trim())
                          .filter(Boolean);
                        onPatch?.({
                          projects: [
                            { ...p, technologies, provenance: "user" },
                          ],
                        });
                      }}
                    />
                  )}
                  {(p.highlights.length || textEditable) && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="group/bullet">
                          <span className="flex w-full items-start gap-1">
                            <InlineText
                              multiline
                              value={h}
                              editable={textEditable}
                              className="min-w-0 flex-1"
                              placeholder="Highlight"
                              onCommit={(next) => {
                                const highlights = [...p.highlights];
                                if (!next.trim()) highlights.splice(i, 1);
                                else highlights[i] = next;
                                onPatch?.({
                                  projects: [
                                    {
                                      ...p,
                                      highlights,
                                      provenance: "user",
                                    },
                                  ],
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
                                      {
                                        ...p,
                                        highlights,
                                        provenance: "user",
                                      },
                                    ],
                                  });
                                }}
                              />
                            ) : null}
                          </span>
                        </li>
                      ))}
                      {textEditable ? (
                        <li className="list-none print:hidden">
                          <InlineText
                            value=""
                            editable
                            emptyLabel="+ add highlight"
                            placeholder="Highlight"
                            onCommit={(next) => {
                              if (!next.trim()) return;
                              onPatch?.({
                                projects: [
                                  {
                                    ...p,
                                    highlights: [
                                      ...p.highlights,
                                      next.trim(),
                                    ],
                                    provenance: "user",
                                  },
                                ],
                              });
                            }}
                          />
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              </div>
            </DeletablePreviewBlock>
          ))}
        </ul>
      ) : null}
      {textEditable ? (
        <p data-resume-block className="mt-2 print:hidden">
          <InlineText
            value=""
            editable
            emptyLabel="+ Add project"
            placeholder="e.g. Portfolio site"
            onCommit={(name) => addProject(name)}
          />
        </p>
      ) : null}
    </div>
  );
}
