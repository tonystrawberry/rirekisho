"use client";

import {
  groupSkillsByCategory,
  isKnownSkillCategory,
  normalizeSkillCategory,
  skillCategoryKey,
} from "@/lib/resume/skill-categories";
import {
  deleteItemMarker,
  type MasterResume,
} from "@/lib/resume/schema";
import { InlineText } from "@/components/preview/inline-text";
import { PreviewDeleteButton } from "@/components/preview/preview-delete";
import type { ResumePatchFn } from "@/templates/shared/preview-props";

type SkillItem = MasterResume["skills"][number];

function storeCategory(raw: string): string {
  const trimmed = raw.trim();
  const canonical = normalizeSkillCategory(trimmed);
  return isKnownSkillCategory(canonical) ? canonical : trimmed;
}

export function SkillsSection({
  skills,
  locale = "en",
  canEdit,
  onPatch,
  compact = false,
}: {
  skills: SkillItem[];
  locale?: string;
  canEdit: boolean;
  onPatch?: ResumePatchFn;
  /** Tighter sidebar layout (modern template). */
  compact?: boolean;
}) {
  const groups = groupSkillsByCategory(skills, locale);

  function renameCategory(fromLabel: string, toRaw: string) {
    const to = storeCategory(toRaw);
    if (!to) return;
    const fromKey = normalizeSkillCategory(fromLabel);
    if (to === fromKey) return;
    const updates = skills
      .filter((s) => skillCategoryKey(s) === fromKey)
      .map((s) => ({
        ...s,
        category: to,
        provenance: "user" as const,
      }));
    if (updates.length) onPatch?.({ skills: updates });
  }

  function addSkill(nameRaw: string, categoryLabel: string) {
    const name = nameRaw.trim();
    if (!name) return;
    onPatch?.({
      skills: [
        {
          id: `skill_${Date.now()}`,
          name,
          category: storeCategory(categoryLabel),
          provenance: "user",
        },
      ],
    });
  }

  if (!skills.length && !canEdit) {
    return (
      <p data-resume-block className="mt-2 text-sm">
        —
      </p>
    );
  }

  return (
    <div className={compact ? "mt-2 space-y-2" : "mt-2 space-y-2"}>
      {groups.map(({ category, skills: items }) => {
        const groupKey = normalizeSkillCategory(category);
        return (
          <div key={groupKey} data-resume-block>
            <p
              className={
                compact
                  ? "m-0 text-sm leading-relaxed"
                  : "m-0 text-sm leading-relaxed"
              }
            >
              <InlineText
                className="font-semibold"
                value={category}
                editable={canEdit}
                placeholder="Category"
                onCommit={(next) => renameCategory(category, next)}
              />
              <span className="font-semibold">: </span>
              {items.map((s, i) => (
                <span
                  key={s.id}
                  className="group/del inline-flex max-w-full items-baseline"
                >
                  {i > 0 ? (
                    <span className="mx-1.5 text-muted" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <InlineText
                    value={s.name}
                    editable={canEdit}
                    placeholder="Skill"
                    onCommit={(name) =>
                      onPatch?.({
                        skills: [
                          {
                            ...s,
                            name,
                            category:
                              storeCategory(
                                s.category?.trim() || category,
                              ),
                            provenance: "user",
                          },
                        ],
                      })
                    }
                  />
                  {canEdit ? (
                    <PreviewDeleteButton
                      label="Remove skill"
                      className="ml-0.5 opacity-0 group-hover/del:opacity-100 focus-visible:opacity-100"
                      onDelete={() =>
                        onPatch?.({ skills: [deleteItemMarker(s.id)] })
                      }
                    />
                  ) : null}
                </span>
              ))}
              {canEdit ? (
                <>
                  <span className="mx-1.5 text-muted print:hidden" aria-hidden>
                    ·
                  </span>
                  <InlineText
                    value=""
                    editable
                    emptyLabel="+ add"
                    placeholder="e.g. TypeScript"
                    className="print:hidden"
                    onCommit={(name) => addSkill(name, category)}
                  />
                </>
              ) : null}
            </p>
          </div>
        );
      })}
      {canEdit ? (
        <p data-resume-block className="m-0 print:hidden">
          <InlineText
            value=""
            editable
            emptyLabel="+ Add skill"
            placeholder="e.g. TypeScript"
            onCommit={(name) => addSkill(name, "Other")}
          />
        </p>
      ) : null}
    </div>
  );
}
