"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import {
  ApplicationForm,
  APPLICATION_STATUS_BADGE_CLASSES,
  APPLICATION_STATUS_OPTIONS,
  type ApplicationFormState,
  type PersonalFormState,
  type ResumeOption,
} from "@/components/applications/application-form";
import { CoverLetterChat } from "@/components/applications/cover-letter-chat";
import { CoverLetterEditor } from "@/components/applications/cover-letter-editor";
import { WorkspaceClient } from "@/app/(app)/workspace/workspace-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import {
  isCoverLetterTemplateId,
  type CoverLetterTemplateId,
} from "@/lib/cover-letter/templates";
import {
  isResumeLocale,
  type ResumeLocaleId,
} from "@/lib/resume/locales";
import type { CompletenessResult } from "@/lib/resume/completeness";
import type { MasterResume } from "@/lib/resume/schema";
import type { TemplateId } from "@/lib/resume/templates";
import { identityToPersonalInput } from "@/lib/applications/sync-identity";
import { cn } from "@/lib/utils";

export type DetailTab = "information" | "resume" | "cover-letter";

export type LinkedResumeWorkspace = {
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
  aiEnabled: boolean;
};

export type ApplicationDetail = {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  jobUrl: string | null;
  jobPostingText: string | null;
  jobPostingParsedAt: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  linkedResumeId: string | null;
  linkedResumeTitle: string | null;
  updatedAt: string;
};

function toFormState(app: ApplicationDetail): ApplicationFormState {
  return {
    title: app.title,
    description: app.description ?? "",
    companyName: app.companyName ?? "",
    jobUrl: app.jobUrl ?? "",
    status: app.status,
    appliedAt: app.appliedAt ? app.appliedAt.slice(0, 10) : "",
    linkedResumeId: app.linkedResumeId ?? "",
  };
}

function formsEqual(a: ApplicationFormState, b: ApplicationFormState) {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.companyName === b.companyName &&
    a.jobUrl === b.jobUrl &&
    a.status === b.status &&
    a.appliedAt === b.appliedAt &&
    a.linkedResumeId === b.linkedResumeId
  );
}

function personalEqual(a: PersonalFormState, b: PersonalFormState) {
  return (
    a.fullName === b.fullName &&
    a.headline === b.headline &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.location === b.location &&
    a.website === b.website
  );
}

export function ApplicationDetailClient({
  application: initialApplication,
  initialTab,
  linkedResumeWorkspace,
  initialPersonal,
  aiEnabled = true,
}: {
  application: ApplicationDetail;
  initialTab: DetailTab;
  linkedResumeWorkspace: LinkedResumeWorkspace | null;
  initialPersonal: PersonalFormState;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [form, setForm] = useState<ApplicationFormState>(() =>
    toFormState(initialApplication),
  );
  const [savedForm, setSavedForm] = useState<ApplicationFormState>(() =>
    toFormState(initialApplication),
  );
  const [personal, setPersonal] = useState<PersonalFormState>(initialPersonal);
  const [savedPersonal, setSavedPersonal] =
    useState<PersonalFormState>(initialPersonal);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingTab, setPendingTab] = useState<DetailTab | null>(null);

  const [coverContent, setCoverContent] = useState("");
  const [coverSubject, setCoverSubject] = useState("");
  const [coverLocale, setCoverLocale] = useState<ResumeLocaleId>("en");
  const [coverTranslating, setCoverTranslating] = useState(false);
  const [coverTemplateId, setCoverTemplateId] =
    useState<CoverLetterTemplateId>("classic");
  const [coverPrimaryColor, setCoverPrimaryColor] = useState("#0f6e56");
  const [coverIdentity, setCoverIdentity] = useState<CoverLetterIdentity>({
    fullName: initialPersonal.fullName || "Your Name",
  });
  const [coverMeta, setCoverMeta] = useState<CoverLetterMeta>({});
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [jobPostingText, setJobPostingText] = useState(
    initialApplication.jobPostingText,
  );
  const [jobPostingParsedAt, setJobPostingParsedAt] = useState(
    initialApplication.jobPostingParsedAt,
  );
  const [jobPostingParsing, setJobPostingParsing] = useState(false);
  const [jobPostingError, setJobPostingError] = useState<string | null>(null);

  const dirty =
    !formsEqual(form, savedForm) || !personalEqual(personal, savedPersonal);

  useEffect(() => {
    void loadResumes();
  }, []);

  useEffect(() => {
    if (tab === "cover-letter" && !coverLoaded) {
      void loadCoverLetter();
    }
  }, [tab, coverLoaded]);

  async function loadResumes() {
    setResumesLoading(true);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const items = Array.isArray(json.resumes)
        ? (json.resumes as Array<{ id: string; title: string }>).map((r) => ({
            id: r.id,
            title: r.title,
          }))
        : [];
      setResumes(items);
    } finally {
      setResumesLoading(false);
    }
  }

  async function loadCoverLetter() {
    setCoverBusy(true);
    setCoverError(null);
    try {
      const [contentRes, chatRes] = await Promise.all([
        fetch(`/api/applications/${application.id}/cover-letter`),
        fetch(`/api/applications/${application.id}/cover-letter/chat`),
      ]);
      const contentJson = await contentRes.json().catch(() => ({}));
      const chatJson = await chatRes.json().catch(() => ({}));
      if (!contentRes.ok) {
        setCoverError(
          contentJson.error?.message || "Could not load cover letter",
        );
        return;
      }
      setCoverContent(contentJson.coverLetter?.content ?? "");
      setCoverSubject(contentJson.coverLetter?.subject ?? "");
      setCoverLocale(
        isResumeLocale(contentJson.coverLetter?.selectedLocale)
          ? contentJson.coverLetter.selectedLocale
          : "en",
      );
      setCoverTemplateId(
        isCoverLetterTemplateId(contentJson.coverLetter?.templateId)
          ? contentJson.coverLetter.templateId
          : "classic",
      );
      if (typeof contentJson.coverLetter?.primaryColor === "string") {
        setCoverPrimaryColor(contentJson.coverLetter.primaryColor);
      }
      if (contentJson.identity) {
        setCoverIdentity(contentJson.identity as CoverLetterIdentity);
      }
      if (contentJson.meta) {
        setCoverMeta(contentJson.meta as CoverLetterMeta);
      } else {
        setCoverMeta({
          companyName: application.companyName,
          jobTitle: application.title,
          letterDate: application.appliedAt,
          recipientName: contentJson.coverLetter?.recipientName ?? null,
          recipientTitle: contentJson.coverLetter?.recipientTitle ?? null,
          recipientEmail: contentJson.coverLetter?.recipientEmail ?? null,
          recipientOrganization:
            contentJson.coverLetter?.recipientOrganization ??
            application.companyName,
          recipientAddress: contentJson.coverLetter?.recipientAddress ?? null,
        });
      }
      setChatId(
        contentJson.conversationId || chatJson.id || `cl_${application.id}`,
      );
      const messages = Array.isArray(chatJson.messages)
        ? (chatJson.messages as Array<{
            id?: string;
            role: string;
            content: string;
          }>).map((m, i) => ({
            id: m.id?.trim() ? m.id : `msg-${i}`,
            role: m.role,
            content: m.content,
          }))
        : [];
      setChatMessages(messages);
      setCoverLoaded(true);
    } catch {
      setCoverError("Network error");
    } finally {
      setCoverBusy(false);
    }
  }

  function setField<K extends keyof ApplicationFormState>(
    key: K,
    value: ApplicationFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPersonalField<K extends keyof PersonalFormState>(
    key: K,
    value: PersonalFormState[K],
  ) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
  }

  function navigateTab(next: DetailTab) {
    if (next === tab) return;
    if (tab === "information" && dirty) {
      setPendingTab(next);
      return;
    }
    applyTab(next);
  }

  function applyTab(next: DetailTab) {
    setTab(next);
    const url = `/applications/${application.id}?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  async function parseJobPosting(force = false) {
    if (jobPostingParsing || busy) return;
    if (!form.jobUrl.trim()) {
      setJobPostingError("Save a job posting URL first");
      return;
    }
    // Persist URL before parsing if the form has unsaved URL changes.
    if (form.jobUrl.trim() !== (application.jobUrl ?? "")) {
      const ok = await saveInformation();
      if (!ok) return;
    }
    setJobPostingParsing(true);
    setJobPostingError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/job-posting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJobPostingError(
          json.error?.message || "Could not parse job posting",
        );
        return;
      }
      setJobPostingText(json.jobPostingText ?? null);
      setJobPostingParsedAt(json.jobPostingParsedAt ?? null);
      setApplication((prev) => ({
        ...prev,
        jobPostingText: json.jobPostingText ?? null,
        jobPostingParsedAt: json.jobPostingParsedAt ?? null,
      }));
    } catch {
      setJobPostingError("Network error");
    } finally {
      setJobPostingParsing(false);
    }
  }

  async function saveInformation(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return false;
    }

    setBusy(true);
    setError(null);
    setPageError(null);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        companyName: form.companyName.trim() || null,
        jobUrl: form.jobUrl.trim() || null,
        status: form.status,
        appliedAt: form.appliedAt
          ? new Date(form.appliedAt).toISOString()
          : null,
        linkedResumeId: form.linkedResumeId || null,
        identity: {
          fullName: personal.fullName,
          headline: personal.headline,
          email: personal.email,
          phone: personal.phone,
          location: personal.location,
          website: personal.website,
        },
      };

      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Could not save application");
        return false;
      }

      const saved = json.application as ApplicationDetail;
      setApplication({
        ...saved,
        jobPostingText: saved.jobPostingText ?? null,
        jobPostingParsedAt: saved.jobPostingParsedAt ?? null,
      });
      setJobPostingText(saved.jobPostingText ?? null);
      setJobPostingParsedAt(saved.jobPostingParsedAt ?? null);
      setJobPostingError(null);
      const nextForm = toFormState(saved);
      setForm(nextForm);
      setSavedForm(nextForm);

      if (json.identity) {
        const nextPersonal = identityToPersonalInput(
          json.identity as CoverLetterIdentity,
        );
        setPersonal(nextPersonal);
        setSavedPersonal(nextPersonal);
        setCoverIdentity(json.identity as CoverLetterIdentity);
      } else {
        setSavedPersonal(personal);
      }

      // Reload cover letter / resume tabs so identity changes show up.
      setCoverLoaded(false);
      router.refresh();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const saveCoverContent = useCallback(
    async (value?: string, subjectValue?: string) => {
      const content = value ?? coverContent;
      const subject = subjectValue ?? coverSubject;
      setCoverBusy(true);
      setCoverError(null);
      try {
        const res = await fetch(
          `/api/applications/${application.id}/cover-letter`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              subject,
              locale: coverLocale,
            }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCoverError(json.error?.message || "Could not save cover letter");
        }
      } catch {
        setCoverError("Network error");
      } finally {
        setCoverBusy(false);
      }
    },
    [application.id, coverContent, coverSubject, coverLocale],
  );

  async function changeCoverLocale(next: ResumeLocaleId) {
    if (next === coverLocale) return;
    setCoverTranslating(true);
    setCoverError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoverError(json.error?.message || "Translation failed");
        return;
      }
      setCoverLocale(next);
      setCoverContent(json.content ?? "");
      setCoverSubject(json.subject ?? "");
    } catch {
      setCoverError("Network error");
    } finally {
      setCoverTranslating(false);
    }
  }

  async function saveCoverTemplate(next: CoverLetterTemplateId) {
    setCoverTemplateId(next);
    setCoverBusy(true);
    setCoverError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: next }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoverError(json.error?.message || "Could not save template");
      }
    } catch {
      setCoverError("Network error");
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveCoverPrimaryColor(next: string) {
    setCoverPrimaryColor(next);
    setCoverBusy(true);
    setCoverError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryColor: next }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoverError(json.error?.message || "Could not save color");
        return;
      }
      if (typeof json.coverLetter?.primaryColor === "string") {
        setCoverPrimaryColor(json.coverLetter.primaryColor);
      }
    } catch {
      setCoverError("Network error");
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveCoverRecipient(metaOverride?: CoverLetterMeta) {
    const meta = metaOverride ?? coverMeta;
    setCoverBusy(true);
    setCoverError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientName: meta.recipientName ?? null,
            recipientTitle: meta.recipientTitle ?? null,
            recipientEmail: meta.recipientEmail ?? null,
            recipientOrganization: meta.recipientOrganization ?? null,
            recipientAddress: meta.recipientAddress ?? null,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoverError(json.error?.message || "Could not save recipient");
        return;
      }
      if (json.meta) {
        setCoverMeta((prev) => ({ ...prev, ...json.meta }));
      }
    } catch {
      setCoverError("Network error");
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveCoverIdentity(next: CoverLetterIdentity) {
    setCoverIdentity(next);
    setCoverError(null);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: next }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoverError(json.error?.message || "Could not save identity");
        return;
      }
      if (json.identity) {
        setCoverIdentity(json.identity as CoverLetterIdentity);
      }
    } catch {
      setCoverError("Network error");
    }
  }

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    setPageError(null);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPageError(json.error?.message || "Could not delete application");
        return;
      }
      router.push("/applications");
      router.refresh();
    } catch {
      setPageError("Network error");
    } finally {
      setBusy(false);
      setDeleting(false);
    }
  }

  const linkedResumeUnavailable =
    !!application.linkedResumeId && !application.linkedResumeTitle;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/applications">Applications</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate max-w-[min(100%,28rem)]">
                  {application.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {application.title}
            </h1>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${APPLICATION_STATUS_BADGE_CLASSES[application.status]}`}
            >
              {
                APPLICATION_STATUS_OPTIONS.find(
                  (s) => s.id === application.status,
                )?.label
              }
            </span>
          </div>
          {application.companyName ? (
            <p className="text-sm text-muted">{application.companyName}</p>
          ) : null}
        </div>
        <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      {pageError ? (
        <p className="text-sm text-danger print:hidden">{pageError}</p>
      ) : null}

      <div className="border-b border-border print:hidden">
        <nav className="-mb-px flex gap-4" aria-label="Application tabs">
          <button
            type="button"
            onClick={() => navigateTab("information")}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              tab === "information"
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            Information
          </button>
          <button
            type="button"
            onClick={() => navigateTab("resume")}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              tab === "resume"
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => navigateTab("cover-letter")}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              tab === "cover-letter"
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            Cover Letter
          </button>
        </nav>
      </div>

      <div
        className={
          tab === "information" ? "block print:hidden" : "hidden print:hidden"
        }
      >
        <div className="max-w-2xl">
          <ApplicationForm
            form={form}
            onChange={setField}
            personal={personal}
            onPersonalChange={setPersonalField}
            resumes={resumes}
            resumesLoading={resumesLoading}
            busy={busy}
            error={error}
            linkedResumeUnavailable={linkedResumeUnavailable}
            showLinkedResumeOpenLink
            idPrefix="detail"
            onSubmit={(e) => void saveInformation(e)}
            jobPosting={{
              text: jobPostingText,
              parsedAt: jobPostingParsedAt,
              parsing: jobPostingParsing,
              error: jobPostingError,
              onParse: (force) => void parseJobPosting(force),
            }}
          />
        </div>
      </div>

      <div
        className={
          tab === "resume" ? "block" : "hidden print:hidden"
        }
      >
        {linkedResumeWorkspace ? (
          <WorkspaceClient
            key={`${linkedResumeWorkspace.profileId}-${linkedResumeWorkspace.profileVersion}`}
            {...linkedResumeWorkspace}
            embedded
            applicationId={application.id}
          />
        ) : (
          <Card className="space-y-3 py-6 text-sm text-muted">
            <p className="font-medium text-foreground">No resume linked</p>
            <p>
              {linkedResumeUnavailable
                ? "The linked resume is no longer available. Pick another resume on the Information tab."
                : "Link a resume on the Information tab to edit it here — same chat and preview as the resume workspace."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigateTab("information")}
            >
              Go to Information
            </Button>
          </Card>
        )}
      </div>

      <div className={tab === "cover-letter" ? "block print:hidden" : "hidden print:hidden"}>
        <div className="grid gap-4 xl:grid-cols-4">
          {coverError && !coverLoaded ? (
            <p className="text-sm text-danger xl:col-span-4">{coverError}</p>
          ) : null}
          <div className="xl:col-span-1">
            {chatId ? (
              <CoverLetterChat
                applicationId={application.id}
                chatId={chatId}
                initialMessages={chatMessages}
                currentContent={coverContent}
                onSuggestionApplied={(content) => {
                  setCoverContent(content);
                }}
                aiEnabled={aiEnabled}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
                {coverBusy ? "Loading chat…" : "Preparing cover letter…"}
              </div>
            )}
          </div>
          <div className="xl:col-span-3">
            {coverLoaded ? (
              <CoverLetterEditor
                applicationId={application.id}
                content={coverContent}
                onChange={setCoverContent}
                onSave={(snapshot) =>
                  saveCoverContent(snapshot?.content, snapshot?.subject)
                }
                subject={coverSubject}
                onSubjectChange={setCoverSubject}
                templateId={coverTemplateId}
                onTemplateChange={(id) => void saveCoverTemplate(id)}
                primaryColor={coverPrimaryColor}
                onPrimaryColorChange={(color) =>
                  void saveCoverPrimaryColor(color)
                }
                locale={coverLocale}
                onLocaleChange={(next) => void changeCoverLocale(next)}
                translating={coverTranslating}
                identity={coverIdentity}
                profileId={application.linkedResumeId}
                onIdentityChange={(next) => void saveCoverIdentity(next)}
                meta={coverMeta}
                onMetaChange={(patch) =>
                  setCoverMeta((prev) => ({ ...prev, ...patch }))
                }
                onSaveRecipient={(meta) => saveCoverRecipient(meta)}
                busy={coverBusy}
                saveError={coverError}
              />
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendingTab}
        onOpenChange={(open) => {
          if (!open) setPendingTab(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on the Information tab. Save before
              switching, or discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Stay</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!pendingTab) return;
                setForm(savedForm);
                setPersonal(savedPersonal);
                applyTab(pendingTab);
                setPendingTab(null);
              }}
            >
              Discard
            </Button>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  const ok = await saveInformation();
                  if (ok && pendingTab) {
                    applyTab(pendingTab);
                    setPendingTab(null);
                  }
                })();
              }}
            >
              {busy ? "Saving…" : "Save & switch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              “{application.title}” and its cover letter will be permanently
              deleted. Linked resumes are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:opacity-90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
