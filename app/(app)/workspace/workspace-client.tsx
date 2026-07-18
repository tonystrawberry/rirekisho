"use client";

import { useState } from "react";
import Link from "next/link";
import { EnrichmentChat } from "@/components/chat/enrichment-chat";
import { ResumeFrame } from "@/components/preview/resume-frame";
import { TemplateSwitcher } from "@/components/preview/template-switcher";
import { ThemeColorPicker } from "@/components/preview/theme-color-picker";
import { ExportControls } from "@/components/export/export-controls";
import { FullscreenA4PreviewButton } from "@/components/preview/fullscreen-a4-preview";
import { StructuredDataEditorButton } from "@/components/preview/structured-data-editor";
import { Card } from "@/components/ui/card";
import type { CompletenessResult } from "@/lib/resume/completeness";
import { computeCompleteness } from "@/lib/resume/completeness";
import { bustResumeImageUrls } from "@/lib/resume/image-urls";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
  resumeThemeCssVars,
} from "@/lib/resume/theme-color";
import type { MasterResume } from "@/lib/resume/schema";
import { masterResumeSchema } from "@/lib/resume/schema";
import { applyConfirmedPatch } from "@/lib/resume/merge";
import type { TemplateId } from "@/lib/resume/templates";
import type { AppliedProfile } from "@/components/chat/patch-confirm";


export function WorkspaceClient({
  profileId,
  resumeTitle,
  chatId,
  initialMessages,
  profileVersion,
  initialCompleteness,
  initialData,
  initialTemplateId,
  initialPrimaryColor,
  initialLocale,
  sourceLocale,
}: {
  profileId: string;
  resumeTitle: string;
  chatId: string;
  initialMessages: Array<{ id: string; role: string; content: string }>;
  profileVersion: number;
  initialCompleteness: CompletenessResult;
  initialData: MasterResume;
  initialTemplateId: TemplateId;
  initialPrimaryColor: string;
  initialLocale: string;
  sourceLocale: string;
}) {
  const [completeness, setCompleteness] = useState(initialCompleteness);
  const [sourceData, setSourceData] = useState(initialData);
  const [resumeData, setResumeData] = useState(initialData);
  const [version, setVersion] = useState(profileVersion);
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplateId);
  const [primaryColor, setPrimaryColor] = useState(
    normalizePrimaryColor(initialPrimaryColor) ?? DEFAULT_PRIMARY_COLOR,
  );
  const [locale, setLocale] = useState(initialLocale);
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [dataEditorOpen, setDataEditorOpen] = useState(false);

  const textEditable = locale === sourceLocale;
  const previewData = textEditable ? sourceData : resumeData;

  async function applyProfileUpdate(profile: AppliedProfile) {
    const parsed = masterResumeSchema.parse(profile.data);
    setSourceData(parsed);
    setCompleteness(profile.completeness as CompletenessResult);
    setVersion(profile.version);
    const selectedLocale =
      (profile.selectedLocale as string | undefined) || locale || sourceLocale;
    if (profile.selectedLocale) setLocale(selectedLocale);
    await loadResumeData(selectedLocale, parsed, profile.version);
    setPreviewUpdatedAt(new Date().toLocaleTimeString());
  }

  async function refreshProfile() {
    const res = await fetch(`/api/profile/${profileId}`);
    if (!res.ok) return;
    const json = await res.json();
    setCompleteness(json.profile.completeness);
    setVersion(json.profile.version);
    if (json.profile.selectedTemplateId) {
      setTemplateId(json.profile.selectedTemplateId as TemplateId);
    }
    if (json.profile.primaryColor) {
      setPrimaryColor(
        normalizePrimaryColor(json.profile.primaryColor as string) ??
          DEFAULT_PRIMARY_COLOR,
      );
    }
    const selectedLocale = (json.profile.selectedLocale as string) || sourceLocale;
    setLocale(selectedLocale);
    const parsed = masterResumeSchema.parse(json.profile.data);
    setSourceData(parsed);
    const cacheKey = json.profile.version ?? json.profile.updatedAt;
    await loadResumeData(selectedLocale, parsed, cacheKey);
    setPreviewUpdatedAt(new Date().toLocaleTimeString());
  }

  async function loadResumeData(
    selectedLocale: string,
    fallback: MasterResume,
    cacheKey?: string | number,
  ) {
    if (selectedLocale !== sourceLocale) {
      const t = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, locale: selectedLocale }),
      });
      if (t.ok) {
        const tj = await t.json();
        setResumeData(bustResumeImageUrls(tj.data, cacheKey));
        return;
      }
    }
    setResumeData(bustResumeImageUrls(fallback, cacheKey));
  }

  async function changeTemplate(id: TemplateId) {
    setTemplateId(id);
    await fetch("/api/preview", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, selectedTemplateId: id }),
    });
  }

  async function changeLocale(next: string, data?: MasterResume) {
    setLocale(next);
    if (data) {
      setResumeData(bustResumeImageUrls(data, Date.now()));
      setPreviewUpdatedAt(new Date().toLocaleTimeString());
      return;
    }
    await loadResumeData(next, sourceData);
  }

  async function saveDirectPatch(patch: import("@/lib/resume/schema").ResumePatch) {
    setEditError(null);
    const expectedVersion = version;
    // Optimistic UI so the preview updates immediately.
    const optimistic = applyConfirmedPatch(sourceData, patch);
    const nextCompleteness = computeCompleteness(optimistic);
    setSourceData(optimistic);
    setVersion(expectedVersion + 1);
    setCompleteness(nextCompleteness);
    if (locale === sourceLocale) {
      setResumeData(bustResumeImageUrls(optimistic, expectedVersion + 1));
    }
    setPreviewUpdatedAt(new Date().toLocaleTimeString());

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        version: expectedVersion,
        patch,
        mode: "direct",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await refreshProfile();
      setEditError(json.error?.message || "Could not save edit");
      throw new Error(json.error?.message || "save failed");
    }
    await applyProfileUpdate({
      data: json.profile.data,
      completeness: json.profile.completeness,
      version: json.profile.version,
      selectedLocale: json.profile.selectedLocale,
    });
  }

  async function saveStructuredData(next: MasterResume) {
    setEditError(null);
    const expectedVersion = version;
    const nextCompleteness = computeCompleteness(next);
    setSourceData(next);
    setVersion(expectedVersion + 1);
    setCompleteness(nextCompleteness);
    if (locale === sourceLocale) {
      setResumeData(bustResumeImageUrls(next, expectedVersion + 1));
    }
    setPreviewUpdatedAt(new Date().toLocaleTimeString());

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        version: expectedVersion,
        data: next,
        mode: "replace",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await refreshProfile();
      const message = json.error?.message || "Could not save structured data";
      setEditError(message);
      throw new Error(message);
    }
    await applyProfileUpdate({
      data: json.profile.data,
      completeness: json.profile.completeness,
      version: json.profile.version,
      selectedLocale: json.profile.selectedLocale,
    });
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <p className="text-sm text-muted">
          <Link href="/resumes" className="hover:text-accent">
            Resumes
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{resumeTitle}</span>
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {resumeTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Build in chat or click any text on the preview to edit it directly,
          then export or share a PDF.
        </p>
      </div>

      <div className="resume-workspace-grid grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-4 print:hidden xl:sticky xl:top-4 xl:self-start">
          <Card className="shrink-0 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Completeness</p>
                <p className="text-2xl font-semibold">{completeness.score}%</p>
              </div>
              <ul className="max-w-md space-y-1 text-xs text-muted">
                {completeness.gaps.slice(0, 3).map((g, i) => (
                  <li key={g.path ?? `${g.section}-${i}`}>
                    <span className="font-medium text-foreground">
                      {g.section}
                    </span>{" "}
                    — {g.message}
                  </li>
                ))}
                {!completeness.gaps.length ? (
                  <li className="text-accent">Looking solid</li>
                ) : null}
              </ul>
            </div>
          </Card>

          <EnrichmentChat
            profileId={profileId}
            chatId={chatId}
            initialMessages={initialMessages}
            profileVersion={version}
            onProfileUpdated={(profile) => void applyProfileUpdate(profile)}
          />
        </div>

        <div className="resume-workspace-panel space-y-3 xl:sticky xl:top-4">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-lg font-medium">Preview</h2>
              <p className="text-xs text-muted">
                {textEditable
                  ? previewUpdatedAt
                    ? `Updated ${previewUpdatedAt} · click text to edit`
                    : "Click any text on the resume to edit"
                  : "Switch back to the source language to edit text inline"}
              </p>
              {editError ? (
                <p className="mt-1 text-xs text-danger">{editError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TemplateSwitcher
                value={templateId}
                onChange={(id) => void changeTemplate(id)}
              />
              <ThemeColorPicker
                profileId={profileId}
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <StructuredDataEditorButton
                open={dataEditorOpen}
                onOpenChange={setDataEditorOpen}
                data={sourceData}
                disabled={!textEditable}
                disabledReason="Switch back to the source language to edit structured data"
                onSave={(data) => saveStructuredData(data)}
              />
              <FullscreenA4PreviewButton
                open={fullscreenPreview}
                onOpenChange={setFullscreenPreview}
                data={previewData}
                templateId={templateId}
                locale={locale}
                primaryColor={primaryColor}
              />
            </div>
          </div>
          <div className="print:hidden">
            <ExportControls
              profileId={profileId}
              locale={locale}
              onLocaleChange={(next, data) => void changeLocale(next, data)}
              hasCriticalGaps={completeness.gaps.some(
                (g) => g.severity === "critical",
              )}
            />
          </div>
          <div
            className="resume-print-root max-h-[calc(100vh-10rem)] overflow-auto rounded-xl border border-border bg-surface/70 p-3 shadow-sm print:max-h-none print:overflow-visible"
            style={resumeThemeCssVars(primaryColor)}
          >
            <ResumeFrame
              data={previewData}
              templateId={templateId}
              locale={locale}
              profileId={profileId}
              editable
              textEditable={textEditable}
              onMediaChanged={() => void refreshProfile()}
              onPatch={(patch) => saveDirectPatch(patch)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
