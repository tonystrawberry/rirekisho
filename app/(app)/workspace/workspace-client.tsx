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
import { CompletenessRing } from "@/components/preview/completeness-ring";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  embedded = false,
  applicationId = null,
  aiEnabled = true,
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
  /** Hide page-level breadcrumb/title when embedded in another page (e.g. application tab). */
  embedded?: boolean;
  /** Application Resume tab — injects parsed job posting into chat. */
  applicationId?: string | null;
  aiEnabled?: boolean;
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

  const isSourceLocale = locale === sourceLocale;
  const previewData = isSourceLocale ? sourceData : resumeData;
  /** Inline + structured edits work on every locale; chat AI still updates source only. */
  const textEditable = true;

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

    if (locale === sourceLocale) {
      const optimistic = applyConfirmedPatch(sourceData, patch);
      const nextCompleteness = computeCompleteness(optimistic);
      setSourceData(optimistic);
      setVersion(expectedVersion + 1);
      setCompleteness(nextCompleteness);
      setResumeData(bustResumeImageUrls(optimistic, expectedVersion + 1));
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
      return;
    }

    const base = resumeData;
    const optimistic = applyConfirmedPatch(base, patch);
    setResumeData(bustResumeImageUrls(optimistic, Date.now()));
    setPreviewUpdatedAt(new Date().toLocaleTimeString());

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        version: expectedVersion,
        patch,
        mode: "direct",
        locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await refreshProfile();
      setEditError(json.error?.message || "Could not save translation edit");
      throw new Error(json.error?.message || "save failed");
    }
    if (json.localePresentation?.data) {
      setResumeData(
        bustResumeImageUrls(json.localePresentation.data, Date.now()),
      );
    }
    if (typeof json.profile?.version === "number") {
      setVersion(json.profile.version);
    }
  }

  async function saveStructuredData(next: MasterResume) {
    setEditError(null);
    const expectedVersion = version;

    if (locale === sourceLocale) {
      const nextCompleteness = computeCompleteness(next);
      setSourceData(next);
      setVersion(expectedVersion + 1);
      setCompleteness(nextCompleteness);
      setResumeData(bustResumeImageUrls(next, expectedVersion + 1));
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
      return;
    }

    setResumeData(bustResumeImageUrls(next, Date.now()));
    setPreviewUpdatedAt(new Date().toLocaleTimeString());

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        version: expectedVersion,
        data: next,
        mode: "replace",
        locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await refreshProfile();
      const message =
        json.error?.message || "Could not save translation structured data";
      setEditError(message);
      throw new Error(message);
    }
    if (json.localePresentation?.data) {
      setResumeData(
        bustResumeImageUrls(json.localePresentation.data, Date.now()),
      );
    }
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="print:hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/resumes">Resumes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate max-w-[min(100%,28rem)]">
                  {resumeTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {resumeTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Build in chat or click any text on the preview to edit it directly,
            then export or share a PDF.
          </p>
        </div>
      ) : null}

      <div className="resume-workspace-grid grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-4 print:hidden xl:sticky xl:top-4 xl:self-start">
          <Card className="shrink-0 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Completeness</p>
                <div className="mt-1 flex items-center gap-2.5">
                  <CompletenessRing score={completeness.score} size={22} strokeWidth={3} />
                  <p className="text-2xl font-semibold tabular-nums">
                    {completeness.score}%
                  </p>
                </div>
              </div>
              <ul className="max-w-md space-y-1 text-xs text-muted">
                {completeness.gaps.slice(0, 3).map((g, i) => (
                  <li key={g.path ?? `${g.section}-${i}`}>
                    <span className="font-medium uppercase tracking-wide text-foreground">
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
            applicationId={applicationId}
            aiEnabled={aiEnabled}
          />
        </div>

        <div className="resume-workspace-panel space-y-3 xl:sticky xl:top-4">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="min-w-0">
              <h2 className="text-lg font-medium">Preview</h2>
              <p className="text-xs text-muted">
                {previewUpdatedAt
                  ? `Updated ${previewUpdatedAt} · click text to edit`
                  : isSourceLocale
                    ? "Click any text on the resume to edit"
                    : "Click any text to fix this translation"}
              </p>
              {editError ? (
                <p className="mt-1 text-xs text-danger">{editError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                data={previewData}
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
              <ExportControls
                profileId={profileId}
                locale={locale}
                onLocaleChange={(next, data) => void changeLocale(next, data)}
                hasCriticalGaps={completeness.gaps.some(
                  (g) => g.severity === "critical",
                )}
              />
            </div>
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
