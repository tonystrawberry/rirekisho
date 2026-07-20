"use client";

import type { ReactNode, FormEvent } from "react";
import Link from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PersonalFormState = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
};

export type ApplicationFormState = {
  title: string;
  description: string;
  companyName: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedAt: string;
  linkedResumeId: string;
};

export type ResumeOption = { id: string; title: string };

export const APPLICATION_STATUS_OPTIONS: Array<{
  id: ApplicationStatus;
  label: string;
}> = [
  { id: "interested", label: "Interested" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

export const APPLICATION_STATUS_BADGE_CLASSES: Record<
  ApplicationStatus,
  string
> = {
  interested: "border-sky-200 bg-sky-50 text-sky-700",
  applied: "border-blue-200 bg-blue-50 text-blue-700",
  interviewing: "border-violet-200 bg-violet-50 text-violet-700",
  offer: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  withdrawn: "border-slate-200 bg-slate-100 text-slate-700",
};

export function emptyPersonalForm(): PersonalFormState {
  return {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
  };
}

type ApplicationFormProps = {
  form: ApplicationFormState;
  onChange: <K extends keyof ApplicationFormState>(
    key: K,
    value: ApplicationFormState[K],
  ) => void;
  resumes: ResumeOption[];
  resumesLoading?: boolean;
  busy?: boolean;
  error?: string | null;
  linkedResumeUnavailable?: boolean;
  showLinkedResumeOpenLink?: boolean;
  idPrefix?: string;
  autoFocusTitle?: boolean;
  footer?: ReactNode;
  onSubmit: (e: FormEvent) => void;
  /** When set, shows a Personal info section that syncs to resume + cover letter. */
  personal?: PersonalFormState;
  onPersonalChange?: <K extends keyof PersonalFormState>(
    key: K,
    value: PersonalFormState[K],
  ) => void;
};

export function ApplicationForm({
  form,
  onChange,
  resumes,
  resumesLoading = false,
  busy = false,
  error = null,
  linkedResumeUnavailable = false,
  showLinkedResumeOpenLink = false,
  idPrefix = "app",
  autoFocusTitle = false,
  footer,
  onSubmit,
  personal,
  onPersonalChange,
}: ApplicationFormProps) {
  const showPersonal = Boolean(personal && onPersonalChange);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Application
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Job details for this application.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-title`} className="text-xs text-muted">
            Title
          </label>
          <Input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            autoFocus={autoFocusTitle}
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-company`} className="text-xs text-muted">
            Company name (optional)
          </label>
          <Input
            id={`${idPrefix}-company`}
            value={form.companyName}
            onChange={(e) => onChange("companyName", e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-description`}
            className="text-xs text-muted"
          >
            Description (optional)
          </label>
          <Textarea
            id={`${idPrefix}-description`}
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-url`} className="text-xs text-muted">
            Job posting URL (optional)
          </label>
          <Input
            id={`${idPrefix}-url`}
            value={form.jobUrl}
            onChange={(e) => onChange("jobUrl", e.target.value)}
            placeholder="https://example.com/jobs/123"
            disabled={busy}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`${idPrefix}-status`} className="text-xs text-muted">
              Status
            </label>
            <select
              id={`${idPrefix}-status`}
              value={form.status}
              onChange={(e) =>
                onChange("status", e.target.value as ApplicationStatus)
              }
              disabled={busy}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            >
              {APPLICATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`${idPrefix}-applied-at`}
              className="text-xs text-muted"
            >
              Applied date (optional)
            </label>
            <Input
              id={`${idPrefix}-applied-at`}
              type="date"
              value={form.appliedAt}
              onChange={(e) => onChange("appliedAt", e.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-resume`} className="text-xs text-muted">
            Linked resume (optional)
          </label>
          <div className="flex gap-2">
            <select
              id={`${idPrefix}-resume`}
              value={form.linkedResumeId}
              onChange={(e) => onChange("linkedResumeId", e.target.value)}
              disabled={busy || resumesLoading}
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">
                {resumesLoading
                  ? "Loading resumes…"
                  : resumes.length
                    ? "No linked resume"
                    : "No resumes available"}
              </option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                </option>
              ))}
            </select>
            {showLinkedResumeOpenLink ? (
              form.linkedResumeId ? (
                <Link
                  href={`/workspace/${form.linkedResumeId}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open resume in new tab"
                  aria-label="Open resume in new tab"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-10 w-10 shrink-0 px-0",
                  )}
                >
                  <SquareArrowOutUpRight className="h-4 w-4" />
                </Link>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 w-10 shrink-0 px-0"
                  disabled
                  title="Select a resume to open"
                  aria-label="Select a resume to open"
                >
                  <SquareArrowOutUpRight className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>
        </div>

        {linkedResumeUnavailable ? (
          <p className="text-xs text-muted">Resume unavailable</p>
        ) : null}
      </section>

      {showPersonal && personal && onPersonalChange ? (
        <>
          <div
            role="separator"
            className="border-t border-border pt-6"
            aria-hidden
          />
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Personal info
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Header details used on your resume and cover letter. Saving
                here overwrites both.
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-full-name`}
                className="text-xs text-muted"
              >
                Full name
              </label>
              <Input
                id={`${idPrefix}-full-name`}
                value={personal.fullName}
                onChange={(e) => onPersonalChange("fullName", e.target.value)}
                placeholder="Your name"
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-headline`}
                className="text-xs text-muted"
              >
                Title / headline
              </label>
              <Input
                id={`${idPrefix}-headline`}
                value={personal.headline}
                onChange={(e) => onPersonalChange("headline", e.target.value)}
                placeholder="e.g. Fullstack Software Engineer"
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-location`}
                className="text-xs text-muted"
              >
                Location
              </label>
              <Input
                id={`${idPrefix}-location`}
                value={personal.location}
                onChange={(e) => onPersonalChange("location", e.target.value)}
                placeholder="City, Country"
                disabled={busy}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor={`${idPrefix}-phone`}
                  className="text-xs text-muted"
                >
                  Phone
                </label>
                <Input
                  id={`${idPrefix}-phone`}
                  value={personal.phone}
                  onChange={(e) => onPersonalChange("phone", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${idPrefix}-email`}
                  className="text-xs text-muted"
                >
                  Email
                </label>
                <Input
                  id={`${idPrefix}-email`}
                  type="email"
                  value={personal.email}
                  onChange={(e) => onPersonalChange("email", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-website`}
                className="text-xs text-muted"
              >
                Website
              </label>
              <Input
                id={`${idPrefix}-website`}
                value={personal.website}
                onChange={(e) => onPersonalChange("website", e.target.value)}
                placeholder="https://"
                disabled={busy}
              />
            </div>
          </section>
        </>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {footer ?? (
        <div className="flex justify-end gap-2">
          {form.jobUrl.trim() ? (
            <a
              href={form.jobUrl.trim()}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Open job posting
            </a>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
