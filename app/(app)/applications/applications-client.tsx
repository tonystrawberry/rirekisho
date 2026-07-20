"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { Link2 } from "lucide-react";
import {
  ApplicationForm,
  APPLICATION_STATUS_BADGE_CLASSES,
  APPLICATION_STATUS_OPTIONS,
  type ApplicationFormState,
  type ResumeOption,
} from "@/components/applications/application-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type ApplicationListItem = {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  jobUrl: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  linkedResumeId: string | null;
  linkedResumeTitle: string | null;
  updatedAt: string;
};

const ALL_STATUSES = "all" as const;
type StatusFilter = ApplicationStatus | typeof ALL_STATUSES;

function emptyForm(): ApplicationFormState {
  return {
    title: "",
    description: "",
    companyName: "",
    jobUrl: "",
    status: "interested",
    appliedAt: "",
    linkedResumeId: "",
  };
}

export function ApplicationsClient({
  initialApplications,
}: {
  initialApplications: ApplicationListItem[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [deleting, setDeleting] = useState<ApplicationListItem | null>(null);
  const [form, setForm] = useState<ApplicationFormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);

  useEffect(() => {
    void loadResumes();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== ALL_STATUSES && app.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) return true;
      return [app.title, app.companyName ?? "", app.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [applications, searchTerm, statusFilter]);

  const sortedApplications = useMemo(
    () =>
      [...filteredApplications].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [filteredApplications],
  );

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

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setPanelOpen(true);
  }

  function setField<K extends keyof ApplicationFormState>(
    key: K,
    value: ApplicationFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return;
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
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Could not save application");
        return;
      }

      const saved = json.application as ApplicationListItem;
      setApplications((prev) => [saved, ...prev]);
      setPanelOpen(false);
      router.push(`/applications/${saved.id}`);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setPageError(null);
    try {
      const res = await fetch(`/api/applications/${deleting.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPageError(json.error?.message || "Could not delete application");
        return;
      }
      setApplications((prev) => prev.filter((a) => a.id !== deleting.id));
      setDeleting(null);
    } catch {
      setPageError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Track job applications, update status over time, and connect each
            role to the resume you submitted.
          </p>
        </div>
        <Button onClick={openCreate}>New application</Button>
      </div>

      {pageError ? <p className="text-sm text-danger">{pageError}</p> : null}

      <section className="space-y-3">
        <Card className="space-y-3 px-6 py-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0 space-y-1">
              <label htmlFor="application-search" className="text-xs text-muted">
                Search applications
              </label>
              <Input
                id="application-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, company, or description"
              />
            </div>
            <div className="w-full shrink-0 space-y-1 md:w-48 md:pr-4">
              <label
                htmlFor="application-status-filter"
                className="mr-1 text-xs text-muted"
              >
                Filter by status
              </label>
              <select
                id="application-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value={ALL_STATUSES}>All statuses</option>
                {APPLICATION_STATUS_OPTIONS.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {!sortedApplications.length ? (
          <Card className="space-y-2 py-5 text-sm text-muted">
            <p>
              {applications.length
                ? "No applications match your current search and filters."
                : "No applications yet."}
            </p>
            <p>
              {applications.length
                ? "Try a different keyword or status filter."
                : "Create your first application to start tracking your job search."}
            </p>
            <div>
              <Button size="sm" onClick={openCreate}>
                Create application
              </Button>
            </div>
          </Card>
        ) : (
          sortedApplications.map((item) => {
            const missingResume =
              !!item.linkedResumeId && !item.linkedResumeTitle;
            return (
              <Card
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <Link
                  href={`/applications/${item.id}`}
                  className="min-w-0 flex-1 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${APPLICATION_STATUS_BADGE_CLASSES[item.status]}`}
                    >
                      {
                        APPLICATION_STATUS_OPTIONS.find(
                          (s) => s.id === item.status,
                        )?.label
                      }
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.companyName || "No company"} · updated{" "}
                    {new Date(item.updatedAt).toLocaleString()}
                  </p>
                  {item.appliedAt ? (
                    <p className="mt-1 text-xs text-muted">
                      Applied on {new Date(item.appliedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                  {item.linkedResumeTitle ? (
                    <p className="mt-1 text-xs text-muted">
                      Linked resume: {item.linkedResumeTitle}
                    </p>
                  ) : null}
                  {missingResume ? (
                    <p className="mt-1 text-xs text-muted">Resume unavailable</p>
                  ) : null}
                </Link>

                <div className="flex flex-wrap gap-2">
                  {item.jobUrl ? (
                    <a
                      href={item.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open job link"
                      title="Open job link"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    >
                      <Link2 className="size-4" />
                    </a>
                  ) : null}
                  <Link
                    href={`/applications/${item.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    Open
                  </Link>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleting(item)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <Dialog
        open={panelOpen}
        onOpenChange={(open) => {
          if (!busy) setPanelOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create application</DialogTitle>
            <DialogDescription>
              Save core details now and update them as your process moves
              forward.
            </DialogDescription>
          </DialogHeader>

          <ApplicationForm
            form={form}
            onChange={setField}
            resumes={resumes}
            resumesLoading={resumesLoading}
            busy={busy}
            error={error}
            autoFocusTitle
            idPrefix="create"
            onSubmit={(e) => void submitCreate(e)}
            footer={
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPanelOpen(false)}
                >
                  Cancel
                </Button>
                {form.jobUrl.trim() ? (
                  <a
                    href={form.jobUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Open job posting
                  </a>
                ) : null}
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save application"}
                </Button>
              </DialogFooter>
            }
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `“${deleting.title}” will be permanently deleted. Linked resumes are not affected.`
                : null}
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
