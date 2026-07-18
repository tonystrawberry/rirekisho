"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IncompleteWarning } from "@/components/export/incomplete-warning";
import { RESUME_LOCALES } from "@/lib/resume/locales";
import type { MasterResume } from "@/lib/resume/schema";

type PendingExport = "pdf" | "docx" | null;

export function ExportControls({
  profileId,
  locale,
  onLocaleChange,
  hasCriticalGaps = false,
}: {
  profileId: string;
  locale: string;
  onLocaleChange: (locale: string, data?: MasterResume) => void;
  hasCriticalGaps?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function translate(next: string) {
    if (busy || shareBusy || docxBusy) return;
    if (next === locale) return;
    setBusy(true);
    setError(null);
    setShareUrl(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, locale: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Translate failed");
        return;
      }
      onLocaleChange(next, json.data as MasterResume);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (busy || shareBusy || docxBusy) return;
    setShareBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Share failed");
        return;
      }
      const path = json.link?.path as string;
      const url =
        (json.link?.url as string)?.startsWith("http")
          ? (json.link.url as string)
          : `${window.location.origin}${path}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Share failed");
    } finally {
      setShareBusy(false);
    }
  }

  function exportPdf(acknowledgeIncomplete: boolean) {
    setError(null);
    if (hasCriticalGaps && !acknowledgeIncomplete) {
      setPendingExport("pdf");
      return;
    }
    setPendingExport(null);
    window.print();
  }

  async function exportDocx(acknowledgeIncomplete: boolean) {
    if (busy || shareBusy || docxBusy) return;
    setError(null);
    if (hasCriticalGaps && !acknowledgeIncomplete) {
      setPendingExport("docx");
      return;
    }
    setPendingExport(null);
    setDocxBusy(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          locale,
          acknowledgeIncomplete: acknowledgeIncomplete || !hasCriticalGaps,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error?.message || "Word export failed");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `resume-${locale}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Word export failed");
    } finally {
      setDocxBusy(false);
    }
  }

  const anyBusy = busy || shareBusy || docxBusy;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RESUME_LOCALES.map((l) => (
          <Button
            key={l.id}
            size="sm"
            variant={locale === l.id ? "default" : "outline"}
            disabled={anyBusy}
            onClick={() => void translate(l.id)}
          >
            {l.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          disabled={anyBusy}
          onClick={() => exportPdf(false)}
        >
          Export PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={anyBusy}
          onClick={() => void exportDocx(false)}
        >
          {docxBusy ? "Exporting…" : "Export Word"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={anyBusy}
          onClick={() => void share()}
        >
          {shareBusy ? "Sharing…" : "Share"}
        </Button>
      </div>
      {shareUrl ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
          <p className="text-muted">
            Public link created for{" "}
            <span className="font-medium text-foreground">
              {RESUME_LOCALES.find((l) => l.id === locale)?.label ?? locale}
            </span>
            {copied ? " · copied to clipboard" : ""}
          </p>
          <p className="mt-1 break-all font-mono">{shareUrl}</p>
          <p className="mt-2">
            <Link href="/sharing" className="text-accent underline-offset-2 hover:underline">
              Manage shares
            </Link>
          </p>
        </div>
      ) : null}
      {busy ? (
        <p className="text-xs text-muted">Translating… this can take a few seconds.</p>
      ) : !shareUrl ? (
        <p className="text-xs text-muted">
          PDF opens print → Save as PDF (margins{" "}
          <span className="font-medium text-foreground">None</span>). Word
          downloads a classical Times New Roman .docx. Share creates a public
          link for the selected language.
        </p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <IncompleteWarning
        open={pendingExport != null}
        onCancel={() => setPendingExport(null)}
        onConfirm={() => {
          if (pendingExport === "docx") void exportDocx(true);
          else exportPdf(true);
        }}
      />
    </div>
  );
}
