"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { RESUME_LOCALES } from "@/lib/resume/locales";

type ShareKind = "cover-letter" | "resume";

type ResumeShareLink = {
  id: string;
  token: string;
  locale: string;
  templateId: string;
  primaryColor: string;
  sourceVersion: number;
  status: "active" | "revoked";
  label: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  path: string;
  url: string;
  resumeTitle?: string;
  profileId?: string;
};

type CoverLetterShareLink = {
  id: string;
  token: string;
  locale: string;
  templateId: string;
  primaryColor: string;
  sourceVersion: number;
  status: "active" | "revoked";
  label: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  path: string;
  url: string;
  applicationId?: string;
  applicationTitle?: string;
  companyName?: string | null;
  coverLetterId?: string;
};

function localeLabel(id: string) {
  return RESUME_LOCALES.find((l) => l.id === id)?.label ?? id;
}

function applicationLabel(link: CoverLetterShareLink) {
  const title = link.applicationTitle?.trim();
  const company = link.companyName?.trim();
  if (title && company) return `${title} · ${company}`;
  return title || company || "Cover letter";
}

export function SharingClient({
  initialResumeLinks,
  initialCoverLetterLinks,
}: {
  initialResumeLinks: ResumeShareLink[];
  initialCoverLetterLinks: CoverLetterShareLink[];
}) {
  const [tab, setTab] = useState<ShareKind>("cover-letter");
  const [resumeLinks, setResumeLinks] = useState(initialResumeLinks);
  const [coverLetterLinks, setCoverLetterLinks] = useState(
    initialCoverLetterLinks,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [resumeRes, coverRes] = await Promise.all([
      fetch("/api/share"),
      fetch("/api/share/cover-letter"),
    ]);
    if (resumeRes.ok) {
      const json = await resumeRes.json();
      setResumeLinks(json.links);
    }
    if (coverRes.ok) {
      const json = await coverRes.json();
      setCoverLetterLinks(json.links);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(
    kind: ShareKind,
    id: string,
    action: "revoke" | "refresh" | "reactivate",
  ) {
    setBusyId(id);
    setError(null);
    const path =
      kind === "resume" ? `/api/share/${id}` : `/api/share/cover-letter/${id}`;
    try {
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Action failed");
        return;
      }
      if (kind === "resume") {
        setResumeLinks((prev) =>
          prev.map((l) => (l.id === id ? (json.link as ResumeShareLink) : l)),
        );
      } else {
        setCoverLetterLinks((prev) =>
          prev.map((l) =>
            l.id === id ? (json.link as CoverLetterShareLink) : l,
          ),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(kind: ShareKind, id: string) {
    if (!confirm("Delete this share link permanently?")) return;
    setBusyId(id);
    setError(null);
    const path =
      kind === "resume" ? `/api/share/${id}` : `/api/share/cover-letter/${id}`;
    try {
      const res = await fetch(path, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error?.message || "Delete failed");
        return;
      }
      if (kind === "resume") {
        setResumeLinks((prev) => prev.filter((l) => l.id !== id));
      } else {
        setCoverLetterLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink(link: ResumeShareLink | CoverLetterShareLink) {
    const absolute = link.url.startsWith("http")
      ? link.url
      : `${window.location.origin}${link.path}`;
    await navigator.clipboard.writeText(absolute);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const links = tab === "resume" ? resumeLinks : coverLetterLinks;
  const active = links.filter((l) => l.status === "active");
  const revoked = links.filter((l) => l.status === "revoked");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sharing</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Manage public links to your cover letters and resumes. Each link
          freezes a snapshot in one language — refresh it to push your latest
          content.
        </p>
      </div>

      <SegmentedControl
        aria-label="Share type"
        value={tab}
        onChange={setTab}
        options={[
          { id: "cover-letter", label: "Cover Letter" },
          { id: "resume", label: "Resume" },
        ]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Active links</h2>
        {!active.length ? (
          <Card className="py-5 text-sm text-muted">
            {tab === "cover-letter" ? (
              <>
                No active cover letter shares yet. Open an application and use{" "}
                <span className="font-medium text-foreground">Export → Share</span>{" "}
                to create a public link.
              </>
            ) : (
              <>
                No active shares yet. Open a resume and use{" "}
                <span className="font-medium text-foreground">Share</span> to
                create a public link for the selected language.
              </>
            )}
          </Card>
        ) : tab === "cover-letter" ? (
          (active as CoverLetterShareLink[]).map((link) => (
            <CoverLetterShareCard
              key={link.id}
              link={link}
              busy={busyId === link.id}
              copied={copiedId === link.id}
              onCopy={() => void copyLink(link)}
              onRefresh={() => void runAction("cover-letter", link.id, "refresh")}
              onRevoke={() => void runAction("cover-letter", link.id, "revoke")}
              onDelete={() => void remove("cover-letter", link.id)}
            />
          ))
        ) : (
          (active as ResumeShareLink[]).map((link) => (
            <ResumeShareCard
              key={link.id}
              link={link}
              busy={busyId === link.id}
              copied={copiedId === link.id}
              onCopy={() => void copyLink(link)}
              onRefresh={() => void runAction("resume", link.id, "refresh")}
              onRevoke={() => void runAction("resume", link.id, "revoke")}
              onDelete={() => void remove("resume", link.id)}
            />
          ))
        )}
      </section>

      {revoked.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Revoked</h2>
          {tab === "cover-letter"
            ? (revoked as CoverLetterShareLink[]).map((link) => (
                <CoverLetterShareCard
                  key={link.id}
                  link={link}
                  busy={busyId === link.id}
                  copied={copiedId === link.id}
                  onCopy={() => void copyLink(link)}
                  onRefresh={() =>
                    void runAction("cover-letter", link.id, "refresh")
                  }
                  onReactivate={() =>
                    void runAction("cover-letter", link.id, "reactivate")
                  }
                  onDelete={() => void remove("cover-letter", link.id)}
                />
              ))
            : (revoked as ResumeShareLink[]).map((link) => (
                <ResumeShareCard
                  key={link.id}
                  link={link}
                  busy={busyId === link.id}
                  copied={copiedId === link.id}
                  onCopy={() => void copyLink(link)}
                  onRefresh={() => void runAction("resume", link.id, "refresh")}
                  onReactivate={() =>
                    void runAction("resume", link.id, "reactivate")
                  }
                  onDelete={() => void remove("resume", link.id)}
                />
              ))}
        </section>
      ) : null}
    </div>
  );
}

function ShareActions({
  status,
  busy,
  copied,
  onCopy,
  onRefresh,
  onRevoke,
  onReactivate,
  onDelete,
}: {
  status: "active" | "revoked";
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onRefresh: () => void;
  onRevoke?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={onCopy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      {status === "active" ? (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={onRefresh}>
            Refresh snapshot
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={onRevoke}>
            Revoke
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={onReactivate}>
          Reactivate
        </Button>
      )}
      <Button size="sm" variant="danger" disabled={busy} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "revoked" }) {
  return (
    <span
      className={
        status === "active"
          ? "rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
          : "rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted"
      }
    >
      {status}
    </span>
  );
}

function ResumeShareCard({
  link,
  busy,
  copied,
  onCopy,
  onRefresh,
  onRevoke,
  onReactivate,
  onDelete,
}: {
  link: ResumeShareLink;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onRefresh: () => void;
  onRevoke?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
}) {
  const displayUrl = link.url.startsWith("http") ? link.url : link.path;

  return (
    <Card className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {link.label || `${localeLabel(link.locale)} resume`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {link.resumeTitle ? `${link.resumeTitle} · ` : ""}
            {localeLabel(link.locale)} · {link.templateId} · v{link.sourceVersion} ·{" "}
            {link.viewCount} view{link.viewCount === 1 ? "" : "s"} · created{" "}
            {new Date(link.createdAt).toLocaleString()}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-muted">{displayUrl}</p>
        </div>
        <StatusBadge status={link.status} />
      </div>
      <ShareActions
        status={link.status}
        busy={busy}
        copied={copied}
        onCopy={onCopy}
        onRefresh={onRefresh}
        onRevoke={onRevoke}
        onReactivate={onReactivate}
        onDelete={onDelete}
      />
    </Card>
  );
}

function CoverLetterShareCard({
  link,
  busy,
  copied,
  onCopy,
  onRefresh,
  onRevoke,
  onReactivate,
  onDelete,
}: {
  link: CoverLetterShareLink;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onRefresh: () => void;
  onRevoke?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
}) {
  const displayUrl = link.url.startsWith("http") ? link.url : link.path;

  return (
    <Card className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {link.label || applicationLabel(link)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {link.label ? `${applicationLabel(link)} · ` : ""}
            {localeLabel(link.locale)} · {link.templateId} · v
            {link.sourceVersion} · {link.viewCount} view
            {link.viewCount === 1 ? "" : "s"} · created{" "}
            {new Date(link.createdAt).toLocaleString()}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-muted">{displayUrl}</p>
        </div>
        <StatusBadge status={link.status} />
      </div>
      <ShareActions
        status={link.status}
        busy={busy}
        copied={copied}
        onCopy={onCopy}
        onRefresh={onRefresh}
        onRevoke={onRevoke}
        onReactivate={onReactivate}
        onDelete={onDelete}
      />
    </Card>
  );
}
