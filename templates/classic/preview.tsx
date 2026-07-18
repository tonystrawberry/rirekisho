"use client";

import { sectionLabel } from "@/lib/resume/section-labels";
import {
  deleteItemMarker,
  deleteItemsMarkers,
} from "@/lib/resume/schema";
import { EntryLogoSlot } from "@/components/profile/entry-logo-slot";
import { ProfilePhotoSlot } from "@/components/profile/profile-photo-slot";
import { InlineText } from "@/components/preview/inline-text";
import {
  DeletablePreviewBlock,
  PreviewDeleteButton,
  PreviewSectionTitle,
} from "@/components/preview/preview-delete";
import { ProjectSection } from "@/templates/shared/project-section";
import { SkillsSection } from "@/templates/shared/skills-section";
import type { ResumePreviewProps } from "@/templates/shared/preview-props";
import { IdentityLinksRow } from "@/components/preview/identity-links";

export function ClassicPreview({
  data,
  locale = "en",
  profileId,
  editable = false,
  textEditable = false,
  onMediaChanged,
  onPatch,
}: ResumePreviewProps) {
  const canEdit = Boolean(textEditable && onPatch);
  const t = (section: Parameters<typeof sectionLabel>[0]) =>
    sectionLabel(section, locale);

  return (
    <article className="w-full bg-white p-8 text-foreground">
      <header
        data-resume-block
        className="flex items-start gap-4 border-b border-border pb-4"
      >
        <ProfilePhotoSlot
          profileId={profileId}
          initialPhotoUrl={data.identity.photoUrl}
          editable={editable}
          variant="classic"
          onChanged={() => onMediaChanged?.()}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <InlineText
            as="h1"
            className="text-3xl font-semibold tracking-tight"
            value={data.identity.fullName}
            editable={canEdit}
            placeholder="Your name"
            onCommit={(fullName) =>
              onPatch?.({ identity: { ...data.identity, fullName } })
            }
          />
          <InlineText
            as="p"
            className="text-base font-medium text-foreground/90"
            value={data.identity.headline ?? ""}
            editable={canEdit}
            emptyLabel="Add a professional title"
            placeholder="e.g. Ruby on Rails Engineer — Spacely Inc"
            onCommit={(headline) =>
              onPatch?.({
                identity: {
                  ...data.identity,
                  headline: headline || undefined,
                },
              })
            }
          />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted">
            <InlineText
              value={data.identity.email ?? ""}
              editable={canEdit}
              emptyLabel="email"
              placeholder="email@example.com"
              onCommit={(email) =>
                onPatch?.({
                  identity: { ...data.identity, email: email || undefined },
                })
              }
            />
            <span className="text-border print:hidden">·</span>
            <InlineText
              value={data.identity.phone ?? ""}
              editable={canEdit}
              emptyLabel="phone"
              placeholder="+1 …"
              onCommit={(phone) =>
                onPatch?.({
                  identity: { ...data.identity, phone: phone || undefined },
                })
              }
            />
            <span className="text-border print:hidden">·</span>
            <InlineText
              value={data.identity.location ?? ""}
              editable={canEdit}
              emptyLabel="location"
              placeholder="City, Country"
              onCommit={(location) =>
                onPatch?.({
                  identity: {
                    ...data.identity,
                    location: location || undefined,
                  },
                })
              }
            />
            <IdentityLinksRow
              links={data.identity.links}
              canEdit={canEdit}
              onChange={(links) =>
                onPatch?.({
                  identity: {
                    ...data.identity,
                    links: links.length ? links : undefined,
                  },
                })
              }
            />
          </div>
        </div>
      </header>

      {(data.summary || canEdit) ? (
        <section data-resume-block className="resume-section mt-6">
          <PreviewSectionTitle
            title={t("summary")}
            canEdit={canEdit && Boolean(data.summary?.trim())}
            onDeleteSection={() => onPatch?.({ summary: "" })}
            className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
          />
          <InlineText
            as="p"
            multiline
            className="mt-2 text-sm leading-relaxed"
            value={data.summary ?? ""}
            editable={canEdit}
            emptyLabel="Add a short professional summary"
            placeholder="Write a concise summary…"
            onCommit={(summary) => onPatch?.({ summary })}
          />
        </section>
      ) : null}

      <section className="resume-section mt-6">
        <PreviewSectionTitle
          title={t("experience")}
          keepWithNext
          canEdit={canEdit && data.experience.length > 0}
          onDeleteSection={() =>
            onPatch?.({ experience: deleteItemsMarkers(data.experience) })
          }
          className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
        />
        <div className="mt-3 space-y-4">
          {data.experience.map((exp) => (
            <DeletablePreviewBlock
              key={exp.id}
              canEdit={canEdit}
              label="Remove experience"
              onDelete={() =>
                onPatch?.({ experience: [deleteItemMarker(exp.id)] })
              }
              className="flex gap-3"
            >
              <div data-resume-block className="flex w-full gap-3">
              <EntryLogoSlot
                profileId={profileId}
                section="experience"
                itemId={exp.id}
                initialLogoUrl={exp.logoUrl}
                editable={editable}
                onChanged={() => onMediaChanged?.()}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2 pr-5">
                  <p className="font-medium">
                    <InlineText
                      value={exp.title}
                      editable={canEdit}
                      placeholder="Job title"
                      onCommit={(title) =>
                        onPatch?.({
                          experience: [{ ...exp, title, provenance: "user" }],
                        })
                      }
                    />
                    <span className="text-muted"> — </span>
                    <InlineText
                      value={exp.company}
                      editable={canEdit}
                      placeholder="Company"
                      onCommit={(company) =>
                        onPatch?.({
                          experience: [{ ...exp, company, provenance: "user" }],
                        })
                      }
                    />
                  </p>
                  <div className="shrink-0 text-right text-xs text-muted">
                    {(exp.location || canEdit) ? (
                      <p>
                        <InlineText
                          value={exp.location ?? ""}
                          editable={canEdit}
                          emptyLabel="location"
                          placeholder="City, Country"
                          onCommit={(location) =>
                            onPatch?.({
                              experience: [
                                {
                                  ...exp,
                                  location: location || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                      </p>
                    ) : null}
                    <p>
                      <InlineText
                        value={exp.startDate ?? ""}
                        editable={canEdit}
                        emptyLabel="start"
                        placeholder="YYYY-MM"
                        onCommit={(startDate) =>
                          onPatch?.({
                            experience: [
                              {
                                ...exp,
                                startDate: startDate || undefined,
                                provenance: "user",
                              },
                            ],
                          })
                        }
                      />
                      <span> – </span>
                      <InlineText
                        value={
                          exp.current ? "Present" : (exp.endDate ?? "")
                        }
                        editable={canEdit}
                        emptyLabel="end"
                        placeholder="YYYY-MM or Present"
                        onCommit={(end) => {
                          const current = /^present$/i.test(end.trim());
                          onPatch?.({
                            experience: [
                              {
                                ...exp,
                                current,
                                endDate: current
                                  ? undefined
                                  : end || undefined,
                                provenance: "user",
                              },
                            ],
                          });
                        }}
                      />
                    </p>
                  </div>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {exp.bullets.map((b, i) => (
                    <li key={`b-${i}`} className="group/bullet">
                      <span className="flex w-full items-start gap-1">
                        <InlineText
                          as="span"
                          multiline
                          value={b}
                          editable={canEdit}
                          className="min-w-0 flex-1"
                          placeholder="Bullet point"
                          onCommit={(next) => {
                            const bullets = [...exp.bullets];
                            if (!next.trim()) bullets.splice(i, 1);
                            else bullets[i] = next;
                            onPatch?.({
                              experience: [
                                { ...exp, bullets, provenance: "user" },
                              ],
                            });
                          }}
                        />
                        {canEdit ? (
                          <PreviewDeleteButton
                            label="Remove bullet"
                            className="mt-0.5 opacity-0 group-hover/bullet:opacity-100 focus-visible:opacity-100"
                            onDelete={() => {
                              const bullets = exp.bullets.filter(
                                (_, idx) => idx !== i,
                              );
                              onPatch?.({
                                experience: [
                                  { ...exp, bullets, provenance: "user" },
                                ],
                              });
                            }}
                          />
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {exp.metrics.map((m, i) => (
                    <li key={`m-${i}`} className="group/bullet">
                      <span className="flex w-full items-start gap-1">
                        <InlineText
                          as="span"
                          multiline
                          value={m}
                          editable={canEdit}
                          className="min-w-0 flex-1"
                          placeholder="Metric"
                          onCommit={(next) => {
                            const metrics = [...exp.metrics];
                            if (!next.trim()) metrics.splice(i, 1);
                            else metrics[i] = next;
                            onPatch?.({
                              experience: [
                                { ...exp, metrics, provenance: "user" },
                              ],
                            });
                          }}
                        />
                        {canEdit ? (
                          <PreviewDeleteButton
                            label="Remove metric"
                            className="mt-0.5 opacity-0 group-hover/bullet:opacity-100 focus-visible:opacity-100"
                            onDelete={() => {
                              const metrics = exp.metrics.filter(
                                (_, idx) => idx !== i,
                              );
                              onPatch?.({
                                experience: [
                                  { ...exp, metrics, provenance: "user" },
                                ],
                              });
                            }}
                          />
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              </div>
            </DeletablePreviewBlock>
          ))}
          {!data.experience.length ? (
            <p className="text-sm text-muted">No experience yet.</p>
          ) : null}
        </div>
      </section>

      {data.education.length ? (
        <section className="resume-section mt-6">
          <PreviewSectionTitle
            title={t("education")}
            keepWithNext
            canEdit={canEdit}
            onDeleteSection={() =>
              onPatch?.({ education: deleteItemsMarkers(data.education) })
            }
            className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
          />
          <div className="mt-3 space-y-3">
            {data.education.map((ed) => (
              <DeletablePreviewBlock
                key={ed.id}
                canEdit={canEdit}
                label="Remove education"
                onDelete={() =>
                  onPatch?.({ education: [deleteItemMarker(ed.id)] })
                }
                className="flex gap-3"
              >
                <div data-resume-block className="flex w-full gap-3">
                <EntryLogoSlot
                  profileId={profileId}
                  section="education"
                  itemId={ed.id}
                  initialLogoUrl={ed.logoUrl}
                  editable={editable}
                  onChanged={() => onMediaChanged?.()}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 pr-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
                    <div className="min-w-0 flex-1">
                      <InlineText
                        as="p"
                        className="m-0 font-medium leading-snug"
                        value={ed.institution}
                        editable={canEdit}
                        placeholder="School"
                        onCommit={(institution) =>
                          onPatch?.({
                            education: [
                              { ...ed, institution, provenance: "user" },
                            ],
                          })
                        }
                      />
                      <p className="m-0 text-sm leading-snug text-muted">
                        <InlineText
                          value={ed.degree ?? ""}
                          editable={canEdit}
                          emptyLabel="degree"
                          placeholder="Degree"
                          onCommit={(degree) =>
                            onPatch?.({
                              education: [
                                {
                                  ...ed,
                                  degree: degree || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                        <span> · </span>
                        <InlineText
                          value={ed.field ?? ""}
                          editable={canEdit}
                          emptyLabel="field"
                          placeholder="Field of study"
                          onCommit={(field) =>
                            onPatch?.({
                              education: [
                                {
                                  ...ed,
                                  field: field || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs leading-snug text-muted">
                      {(ed.location || canEdit) ? (
                        <p className="m-0">
                          <InlineText
                            value={ed.location ?? ""}
                            editable={canEdit}
                            emptyLabel="location"
                            placeholder="City, Country"
                            onCommit={(location) =>
                              onPatch?.({
                                education: [
                                  {
                                    ...ed,
                                    location: location || undefined,
                                    provenance: "user",
                                  },
                                ],
                              })
                            }
                          />
                        </p>
                      ) : null}
                      <p className="m-0">
                        <InlineText
                          value={ed.startDate ?? ""}
                          editable={canEdit}
                          emptyLabel="start"
                          placeholder="YYYY"
                          onCommit={(startDate) =>
                            onPatch?.({
                              education: [
                                {
                                  ...ed,
                                  startDate: startDate || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                        {(ed.startDate || ed.endDate || canEdit) ? (
                          <span> – </span>
                        ) : null}
                        <InlineText
                          value={ed.endDate ?? ""}
                          editable={canEdit}
                          emptyLabel="end"
                          placeholder="YYYY"
                          onCommit={(endDate) =>
                            onPatch?.({
                              education: [
                                {
                                  ...ed,
                                  endDate: endDate || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </DeletablePreviewBlock>
            ))}
          </div>
        </section>
      ) : null}

      <section className="resume-section mt-6">
        <PreviewSectionTitle
          title={t("skills")}
          keepWithNext
          canEdit={canEdit && data.skills.length > 0}
          onDeleteSection={() =>
            onPatch?.({ skills: deleteItemsMarkers(data.skills) })
          }
          className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
        />
        <SkillsSection
          skills={data.skills}
          locale={locale}
          canEdit={canEdit}
          onPatch={onPatch}
        />
      </section>

      {(data.projects.length || canEdit) ? (
        <section className="resume-section mt-6">
          <PreviewSectionTitle
            title={t("projects")}
            keepWithNext
            canEdit={canEdit && data.projects.length > 0}
            onDeleteSection={() =>
              onPatch?.({ projects: deleteItemsMarkers(data.projects) })
            }
            className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
          />
          <div data-resume-block>
            <ProjectSection
              projects={data.projects}
              profileId={profileId}
              editable={editable}
              textEditable={canEdit}
              onPatch={onPatch}
              onMediaChanged={onMediaChanged}
            />
          </div>
        </section>
      ) : null}

      {(data.certifications ?? []).length ? (
        <section className="resume-section mt-6">
          <PreviewSectionTitle
            title={t("certifications")}
            keepWithNext
            canEdit={canEdit}
            onDeleteSection={() =>
              onPatch?.({
                certifications: deleteItemsMarkers(data.certifications ?? []),
              })
            }
            className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
          />
          <ul className="mt-2 space-y-2 text-sm">
            {(data.certifications ?? []).map((c) => (
              <DeletablePreviewBlock
                key={c.id}
                as="li"
                canEdit={canEdit}
                label="Remove certification"
                onDelete={() =>
                  onPatch?.({ certifications: [deleteItemMarker(c.id)] })
                }
                className="flex gap-2 pr-5"
              >
                  <EntryLogoSlot
                    profileId={profileId}
                    section="certifications"
                    itemId={c.id}
                    initialLogoUrl={c.logoUrl}
                    editable={editable}
                    onChanged={() => onMediaChanged?.()}
                  />
                  <div className="min-w-0" data-resume-block>
                    <InlineText
                      className="font-medium"
                      value={c.name}
                      editable={canEdit}
                      placeholder="Certification"
                      onCommit={(name) =>
                        onPatch?.({
                          certifications: [{ ...c, name, provenance: "user" }],
                        })
                      }
                    />
                    <span className="text-muted"> — </span>
                    <InlineText
                      className="text-muted"
                      value={c.issuer ?? ""}
                      editable={canEdit}
                      emptyLabel="issuer"
                      placeholder="Issuer"
                      onCommit={(issuer) =>
                        onPatch?.({
                          certifications: [
                            {
                              ...c,
                              issuer: issuer || undefined,
                              provenance: "user",
                            },
                          ],
                        })
                      }
                    />
                    {(c.date || canEdit) ? (
                      <>
                        <span className="text-muted">, </span>
                        <InlineText
                          className="text-muted"
                          value={c.date ?? ""}
                          editable={canEdit}
                          emptyLabel="date"
                          placeholder="YYYY"
                          onCommit={(date) =>
                            onPatch?.({
                              certifications: [
                                {
                                  ...c,
                                  date: date || undefined,
                                  provenance: "user",
                                },
                              ],
                            })
                          }
                        />
                      </>
                    ) : null}
                  </div>
              </DeletablePreviewBlock>
            ))}
          </ul>
        </section>
      ) : null}

      {(data.references ?? []).length ? (
        <section className="resume-section mt-6">
          <PreviewSectionTitle
            title={t("references")}
            keepWithNext
            canEdit={canEdit}
            onDeleteSection={() =>
              onPatch?.({
                references: deleteItemsMarkers(data.references ?? []),
              })
            }
            className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
          />
          <ul className="mt-2 space-y-3 text-sm">
            {(data.references ?? []).map((r) => (
              <DeletablePreviewBlock
                key={r.id}
                as="li"
                canEdit={canEdit}
                label="Remove reference"
                onDelete={() =>
                  onPatch?.({ references: [deleteItemMarker(r.id)] })
                }
                className="pr-5"
              >
                  <div data-resume-block>
                  <InlineText
                    as="p"
                    className="font-medium"
                    value={r.name}
                    editable={canEdit}
                    placeholder="Name"
                    onCommit={(name) =>
                      onPatch?.({
                        references: [{ ...r, name, provenance: "user" }],
                      })
                    }
                  />
                  <p className="text-muted">
                    <InlineText
                      value={r.role ?? ""}
                      editable={canEdit}
                      emptyLabel="role"
                      placeholder="Role"
                      onCommit={(role) =>
                        onPatch?.({
                          references: [
                            {
                              ...r,
                              role: role || undefined,
                              provenance: "user",
                            },
                          ],
                        })
                      }
                    />
                    <span> · </span>
                    <InlineText
                      value={r.company ?? ""}
                      editable={canEdit}
                      emptyLabel="company"
                      placeholder="Company"
                      onCommit={(company) =>
                        onPatch?.({
                          references: [
                            {
                              ...r,
                              company: company || undefined,
                              provenance: "user",
                            },
                          ],
                        })
                      }
                    />
                  </p>
                  <InlineText
                    as="p"
                    className="text-muted"
                    value={r.email ?? ""}
                    editable={canEdit}
                    emptyLabel="email"
                    placeholder="email@example.com"
                    onCommit={(email) =>
                      onPatch?.({
                        references: [
                          {
                            ...r,
                            email: email || undefined,
                            provenance: "user",
                          },
                        ],
                      })
                    }
                  />
                  </div>
              </DeletablePreviewBlock>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="resume-section mt-6">
        <PreviewSectionTitle
          title={t("hobbies")}
          keepWithNext
          canEdit={canEdit && (data.hobbies ?? []).length > 0}
          onDeleteSection={() =>
            onPatch?.({ hobbies: deleteItemsMarkers(data.hobbies ?? []) })
          }
          className="resume-theme-heading text-sm font-semibold uppercase tracking-wide"
        />
        <ul className="mt-2 space-y-2 text-sm">
          {(data.hobbies ?? []).map((h) => (
            <li
              key={h.id}
              data-resume-block
              className="group/del relative flex flex-wrap items-baseline gap-x-1 pr-5"
            >
              <InlineText
                className="font-medium"
                value={h.name}
                editable={canEdit}
                placeholder="Hobby"
                onCommit={(name) =>
                  onPatch?.({
                    hobbies: [{ ...h, name, provenance: "user" }],
                  })
                }
              />
              {h.description || canEdit ? (
                <>
                  <span className="text-muted"> — </span>
                  <InlineText
                    className="text-muted"
                    value={h.description ?? ""}
                    editable={canEdit}
                    emptyLabel="add a short description"
                    placeholder="Description"
                    onCommit={(description) =>
                      onPatch?.({
                        hobbies: [
                          {
                            ...h,
                            description: description || undefined,
                            provenance: "user",
                          },
                        ],
                      })
                    }
                  />
                </>
              ) : null}
              {canEdit ? (
                <PreviewDeleteButton
                  label="Remove hobby"
                  className="absolute right-0 top-0 opacity-0 group-hover/del:opacity-100 focus-visible:opacity-100"
                  onDelete={() =>
                    onPatch?.({ hobbies: [deleteItemMarker(h.id)] })
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
        {canEdit ? (
          <p data-resume-block className="mt-2 print:hidden">
            <InlineText
              value=""
              editable
              emptyLabel="+ Add hobby"
              placeholder="e.g. Photography"
              onCommit={async (name) => {
                if (!name.trim()) return;
                await onPatch?.({
                  hobbies: [
                    {
                      id: `hobby_${Date.now()}`,
                      name: name.trim(),
                      provenance: "user",
                    },
                  ],
                });
              }}
            />
          </p>
        ) : !(data.hobbies ?? []).length ? (
          <p data-resume-block className="mt-2 text-sm">
            —
          </p>
        ) : null}
      </section>
    </article>
  );
}
