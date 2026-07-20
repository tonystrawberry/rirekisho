"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CoverLetterFrame } from "@/components/applications/cover-letter-frame";
import { FullscreenCoverLetterPreviewButton } from "@/components/applications/cover-letter-preview-button";
import { CoverLetterExportControls } from "@/components/applications/cover-letter-export-controls";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import { coverLetterLabels } from "@/lib/cover-letter/labels";
import {
  COVER_LETTER_TEMPLATES,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import { RESUME_LOCALES, type ResumeLocaleId } from "@/lib/resume/locales";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import { cn } from "@/lib/utils";
import { printCoverLetter } from "@/lib/cover-letter/print";

export function CoverLetterEditor({
  applicationId,
  content,
  onChange,
  onSave,
  subject,
  onSubjectChange,
  templateId,
  onTemplateChange,
  primaryColor,
  onPrimaryColorChange,
  locale,
  onLocaleChange,
  translating = false,
  identity,
  profileId = null,
  onIdentityChange,
  meta,
  onMetaChange,
  onSaveRecipient,
  busy = false,
  saveError = null,
}: {
  applicationId: string;
  content: string;
  onChange: (value: string) => void;
  onSave: (snapshot?: {
    content: string;
    subject: string;
  }) => void | Promise<void>;
  subject: string;
  onSubjectChange: (value: string) => void;
  templateId: CoverLetterTemplateId;
  onTemplateChange: (id: CoverLetterTemplateId) => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  locale: ResumeLocaleId;
  onLocaleChange: (locale: ResumeLocaleId) => void | Promise<void>;
  translating?: boolean;
  identity: CoverLetterIdentity;
  profileId?: string | null;
  onIdentityChange: (next: CoverLetterIdentity) => void | Promise<void>;
  meta: CoverLetterMeta;
  onMetaChange: (patch: Partial<CoverLetterMeta>) => void;
  onSaveRecipient: (meta: CoverLetterMeta) => void | Promise<void>;
  busy?: boolean;
  saveError?: string | null;
}) {
  const [dirty, setDirty] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [showRecipient, setShowRecipient] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recipientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const subjectRef = useRef(subject);
  const metaRef = useRef(meta);
  contentRef.current = content;
  subjectRef.current = subject;
  metaRef.current = meta;
  const color = normalizePrimaryColor(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
  const labels = coverLetterLabels(locale);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (recipientTimer.current) clearTimeout(recipientTimer.current);
      if (subjectTimer.current) clearTimeout(subjectTimer.current);
    };
  }, []);

  function handleChange(value: string) {
    contentRef.current = value;
    onChange(value);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void Promise.resolve(
        onSave({
          content: contentRef.current,
          subject: subjectRef.current,
        }),
      ).then(() => setDirty(false));
    }, 800);
  }

  function handleSubjectChange(value: string) {
    subjectRef.current = value;
    onSubjectChange(value);
    setDirty(true);
    if (subjectTimer.current) clearTimeout(subjectTimer.current);
    subjectTimer.current = setTimeout(() => {
      void Promise.resolve(
        onSave({
          content: contentRef.current,
          subject: subjectRef.current,
        }),
      ).then(() => setDirty(false));
    }, 800);
  }

  function handleRecipientField<K extends keyof CoverLetterMeta>(
    key: K,
    value: CoverLetterMeta[K],
  ) {
    const next = { ...metaRef.current, [key]: value };
    metaRef.current = next;
    onMetaChange({ [key]: value });
    setDirty(true);
    if (recipientTimer.current) clearTimeout(recipientTimer.current);
    recipientTimer.current = setTimeout(() => {
      void Promise.resolve(onSaveRecipient(metaRef.current)).then(() =>
        setDirty(false),
      );
    }, 800);
  }

  async function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (recipientTimer.current) clearTimeout(recipientTimer.current);
    if (subjectTimer.current) clearTimeout(subjectTimer.current);
    await Promise.all([
      Promise.resolve(
        onSave({
          content: contentRef.current,
          subject: subjectRef.current,
        }),
      ),
      Promise.resolve(onSaveRecipient(metaRef.current)),
    ]);
    setDirty(false);
  }

  return (
    <div className="flex h-[calc(100dvh-20rem)] max-h-[calc(100dvh-20rem)] min-h-[16rem] flex-col overflow-hidden rounded-xl border border-border bg-card xl:h-[calc(100dvh-10rem)] xl:max-h-[calc(100dvh-10rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Cover letter</p>
          <SegmentedControl
            aria-label="Cover letter template"
            value={templateId}
            options={COVER_LETTER_TEMPLATES.map((t) => ({
              id: t.id,
              label: t.name,
            }))}
            onChange={onTemplateChange}
            disabled={busy || translating}
          />
          <SegmentedControl
            aria-label="Cover letter language"
            value={locale}
            options={RESUME_LOCALES.map((l) => ({
              id: l.id,
              label: l.id.toUpperCase(),
            }))}
            onChange={(id) => void onLocaleChange(id)}
            disabled={busy || translating}
          />
          <label
            className={cn(
              "relative inline-block h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border",
              (busy || translating) && "opacity-50",
            )}
            style={{ backgroundColor: color }}
            title={`Highlight color ${color}`}
          >
            <span className="sr-only">Cover letter highlight color</span>
            <input
              type="color"
              value={color}
              disabled={busy || translating}
              onChange={(e) => {
                const next = normalizePrimaryColor(e.target.value);
                if (next) onPrimaryColorChange(next);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Cover letter highlight color"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">
            {translating
              ? "Translating…"
              : busy
                ? "Saving…"
                : dirty
                  ? "Unsaved"
                  : "Saved"}
          </span>
          <Button
            size="sm"
            variant={showRecipient ? "secondary" : "outline"}
            onClick={() => setShowRecipient((v) => !v)}
          >
            {showRecipient ? "Hide destinataire" : labels.attentionOf}
          </Button>
          <Button
            size="sm"
            variant={showMarkdown ? "secondary" : "outline"}
            onClick={() => setShowMarkdown((v) => !v)}
          >
            {showMarkdown ? "Hide markdown" : "Edit markdown"}
          </Button>
          <FullscreenCoverLetterPreviewButton
            open={fullscreenPreview}
            onOpenChange={setFullscreenPreview}
            content={content}
            subject={subject}
            identity={identity}
            meta={meta}
            templateId={templateId}
            locale={locale}
            primaryColor={color}
          />
          <CoverLetterExportControls
            applicationId={applicationId}
            locale={locale}
            disabled={busy || translating}
            onPrint={() => {
              printCoverLetter();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || translating}
            onClick={() => void saveNow()}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-border px-4 py-2">
        <label htmlFor="cl-subject" className="mb-1 block text-xs text-muted">
          {labels.subject}
        </label>
        <Input
          id="cl-subject"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          placeholder={
            locale === "fr"
              ? "ex. Candidature au poste de…"
              : locale === "ja"
                ? "例：〇〇職への応募"
                : "e.g. Application for the … role"
          }
          disabled={busy || translating}
        />
      </div>

      {showRecipient ? (
        <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted">
            {labels.attentionOf}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="cl-recipient-name" className="text-xs text-muted">
                Nom
              </label>
              <Input
                id="cl-recipient-name"
                value={meta.recipientName ?? ""}
                onChange={(e) =>
                  handleRecipientField("recipientName", e.target.value)
                }
                placeholder="ex. Professeur John Watson"
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cl-recipient-title" className="text-xs text-muted">
                Titre / fonction
              </label>
              <Input
                id="cl-recipient-title"
                value={meta.recipientTitle ?? ""}
                onChange={(e) =>
                  handleRecipientField("recipientTitle", e.target.value)
                }
                placeholder="ex. Responsable des admissions"
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cl-recipient-email" className="text-xs text-muted">
                E-mail
              </label>
              <Input
                id="cl-recipient-email"
                value={meta.recipientEmail ?? ""}
                onChange={(e) =>
                  handleRecipientField("recipientEmail", e.target.value)
                }
                placeholder="ex. admissions@example.com"
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cl-recipient-org" className="text-xs text-muted">
                Organisation
              </label>
              <Input
                id="cl-recipient-org"
                value={meta.recipientOrganization ?? meta.companyName ?? ""}
                onChange={(e) =>
                  handleRecipientField("recipientOrganization", e.target.value)
                }
                placeholder="ex. Université de Cambridge"
                disabled={busy}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="cl-recipient-address"
                className="text-xs text-muted"
              >
                Adresse
              </label>
              <Textarea
                id="cl-recipient-address"
                value={meta.recipientAddress ?? ""}
                onChange={(e) =>
                  handleRecipientField("recipientAddress", e.target.value)
                }
                placeholder={"ex. Trinity Lane\nCambridge CB2 1TN\nRoyaume-Uni"}
                rows={3}
                disabled={busy}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Click the banner fields to edit your sender details.
            {!profileId
              ? " Link a resume to enable photo upload."
              : null}
          </p>
        </div>
      ) : null}

      <div
        className={
          showMarkdown
            ? "grid min-h-0 flex-1 grid-cols-1 divide-y divide-border lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-y-0"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        {showMarkdown ? (
          <div className="flex min-h-0 flex-col p-3">
            <label
              htmlFor="cover-letter-markdown"
              className="mb-2 text-xs text-muted"
            >
              Markdown
            </label>
            <Textarea
              id="cover-letter-markdown"
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Write your cover letter in markdown…"
              className="min-h-0 flex-1 resize-none font-mono text-sm"
              disabled={busy || translating}
            />
          </div>
        ) : null}

        <div className="cover-letter-print-root min-h-0 flex-1 overflow-y-auto overscroll-contain bg-neutral-100/80 p-4">
          <div className="mx-auto w-full max-w-[210mm]">
            <CoverLetterFrame
              content={content}
              subject={subject}
              identity={identity}
              meta={meta}
              templateId={templateId}
              locale={locale}
              primaryColor={color}
              editable
              profileId={profileId}
              onIdentityChange={(next) => void onIdentityChange(next)}
            />
          </div>
          {!content.trim() ? (
            <p className="mx-auto mt-3 max-w-[210mm] text-center text-xs text-muted print:hidden">
              Ask the assistant for a draft, or open Edit markdown.
            </p>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <p className="border-t border-border px-4 py-2 text-sm text-danger">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
