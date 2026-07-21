"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type ResumeListItem = {
  id: string;
  title: string;
  selectedLocale: string;
  selectedTemplateId: string;
  completenessScore: number | null;
  version: number;
  updatedAt: string;
};

export function ResumesClient({
  initialResumes,
  defaultFullName,
}: {
  initialResumes: ResumeListItem[];
  defaultFullName: string;
}) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initialResumes);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<ResumeListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinTitle, setLinkedinTitle] = useState("");
  const [linkedinBusy, setLinkedinBusy] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinWarning, setLinkedinWarning] = useState<string | null>(null);

  useEffect(() => {
    if (renameTarget) {
      setRenameValue(renameTarget.title);
      setRenameError(null);
    }
  }, [renameTarget]);

  async function createResume(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          fullName: defaultFullName,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Could not create resume");
        return;
      }
      router.push(`/workspace/${json.profile.id}`);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function createWithLinkedIn(e?: React.FormEvent) {
    e?.preventDefault();
    if (linkedinBusy) return;
    setLinkedinBusy(true);
    setLinkedinError(null);
    setLinkedinWarning(null);
    try {
      const res = await fetch("/api/import/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrl: linkedinUrl.trim(),
          title: linkedinTitle.trim() || title.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkedinError(
          json.error?.message || "Could not import from LinkedIn",
        );
        return;
      }
      const warnings = Array.isArray(json.warnings)
        ? (json.warnings as string[]).filter(Boolean)
        : [];
      if (warnings.length) setLinkedinWarning(warnings[0] ?? null);
      router.push(`/workspace/${json.profile.id}`);
    } catch {
      setLinkedinError("Network error");
    } finally {
      setLinkedinBusy(false);
    }
  }

  async function submitRename(e?: React.FormEvent) {
    e?.preventDefault();
    if (!renameTarget || renameBusy) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Title is required");
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/profile/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRenameError(json.error?.message || "Could not rename resume");
        return;
      }
      setResumes((prev) =>
        prev.map((r) =>
          r.id === renameTarget.id
            ? { ...r, title: json.profile.title as string }
            : r,
        ),
      );
      setRenameTarget(null);
    } catch {
      setRenameError("Network error");
    } finally {
      setRenameBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/profile/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setResumes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function duplicateResume(resume: ResumeListItem) {
    if (duplicatingId) return;
    setDuplicatingId(resume.id);
    setError(null);
    try {
      const res = await fetch(`/api/profile/${resume.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Could not duplicate resume");
        return;
      }
      const item = json.resume as ResumeListItem | undefined;
      if (item) {
        setResumes((prev) => [item, ...prev]);
      }
      router.push(`/workspace/${json.profile.id}`);
    } catch {
      setError("Network error");
    } finally {
      setDuplicatingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Resumes</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Create and open resumes. Each one has its own chat, preview, and share
          links. Duplicate an existing resume to tailor a copy for a new role.
        </p>
      </div>

      <Card className="space-y-3 py-5">
        <h2 className="text-lg font-medium">New resume</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => void createResume(e)}
        >
          <div className="min-w-[14rem] flex-1 space-y-1">
            <label className="text-xs text-muted" htmlFor="resume-title">
              Title
            </label>
            <Input
              id="resume-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software engineer — 2026"
            />
          </div>
          <Button type="submit" disabled={busy || linkedinBusy}>
            {busy ? "Creating…" : "Create resume"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || linkedinBusy}
            onClick={() => {
              setLinkedinError(null);
              setLinkedinWarning(null);
              setLinkedinTitle(title);
              setLinkedinOpen(true);
            }}
          >
            Create with LinkedIn
          </Button>
        </form>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Your resumes</h2>
        {!resumes.length ? (
          <Card className="py-5 text-sm text-muted">
            No resumes yet. Create one to open the workspace.
          </Card>
        ) : (
          resumes.map((r) => (
            <Card
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => router.push(`/workspace/${r.id}`)}
              >
                <p className="font-medium hover:text-accent">{r.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {r.selectedTemplateId} · {r.selectedLocale}
                  {r.completenessScore != null
                    ? ` · ${r.completenessScore}% complete`
                    : ""}{" "}
                  · updated {new Date(r.updatedAt).toLocaleString()}
                </p>
              </button>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/workspace/${r.id}`)}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={duplicatingId === r.id}
                  onClick={() => void duplicateResume(r)}
                >
                  {duplicatingId === r.id ? "Duplicating…" : "Duplicate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRenameTarget(r)}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteTarget(r)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      <Dialog
        open={linkedinOpen}
        onOpenChange={(open) => {
          if (!open && !linkedinBusy) setLinkedinOpen(false);
          else setLinkedinOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void createWithLinkedIn(e)}>
            <DialogHeader>
              <DialogTitle>Create with LinkedIn</DialogTitle>
              <DialogDescription>
                Paste your LinkedIn profile URL. We’ll create a new resume and
                fill it from your public professional history.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label
                  className="text-xs text-muted"
                  htmlFor="linkedin-profile-url"
                >
                  LinkedIn profile URL
                </label>
                <Input
                  id="linkedin-profile-url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/your-name"
                  autoFocus
                  disabled={linkedinBusy}
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs text-muted"
                  htmlFor="linkedin-resume-title"
                >
                  Resume title (optional)
                </label>
                <Input
                  id="linkedin-resume-title"
                  value={linkedinTitle}
                  onChange={(e) => setLinkedinTitle(e.target.value)}
                  placeholder="e.g. Software engineer — LinkedIn"
                  disabled={linkedinBusy}
                />
              </div>
              {linkedinError ? (
                <p className="text-sm text-danger">{linkedinError}</p>
              ) : null}
              {linkedinWarning ? (
                <p className="text-sm text-muted">{linkedinWarning}</p>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={linkedinBusy}
                onClick={() => setLinkedinOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={linkedinBusy}>
                {linkedinBusy ? "Importing…" : "Import & create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open && !renameBusy) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void submitRename(e)}>
            <DialogHeader>
              <DialogTitle>Rename resume</DialogTitle>
              <DialogDescription>
                Choose a clear title so you can find this resume later.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <label className="text-xs text-muted" htmlFor="rename-resume-title">
                Title
              </label>
              <Input
                id="rename-resume-title"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                disabled={renameBusy}
              />
              {renameError ? (
                <p className="text-sm text-danger">{renameError}</p>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={renameBusy}
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameBusy}>
                {renameBusy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resume?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” will be permanently deleted, including its chat and share links. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:opacity-90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
