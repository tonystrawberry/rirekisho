"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileDown, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncompleteWarning } from "@/components/export/incomplete-warning";
import { RESUME_LOCALES } from "@/lib/resume/locales";
import type { MasterResume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
    setMenuOpen(false);
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
      setMenuOpen(false);
      return;
    }
    setPendingExport(null);
    setMenuOpen(false);
    window.print();
  }

  async function exportDocx(acknowledgeIncomplete: boolean) {
    if (busy || shareBusy || docxBusy) return;
    setError(null);
    if (hasCriticalGaps && !acknowledgeIncomplete) {
      setPendingExport("docx");
      setMenuOpen(false);
      return;
    }
    setPendingExport(null);
    setMenuOpen(false);
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
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Language"
        className="inline-flex rounded-md border border-border bg-card p-0.5"
      >
        {RESUME_LOCALES.map((l) => {
          const active = locale === l.id;
          return (
            <button
              key={l.id}
              type="button"
              disabled={anyBusy}
              onClick={() => void translate(l.id)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                "disabled:pointer-events-none disabled:opacity-50",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      <div className="relative" ref={menuRef}>
        <Button
          size="sm"
          variant="default"
          disabled={anyBusy}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((o) => !o)}
          className="gap-1"
        >
          {docxBusy ? "Exporting…" : shareBusy ? "Sharing…" : "Export"}
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-md border border-border bg-card py-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
              onClick={() => exportPdf(false)}
            >
              <FileDown className="h-3.5 w-3.5 text-muted" />
              PDF
              <span className="ml-auto text-[10px] text-muted">Print</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
              onClick={() => void exportDocx(false)}
            >
              <FileText className="h-3.5 w-3.5 text-muted" />
              Word (.docx)
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
              onClick={() => void share()}
            >
              <Link2 className="h-3.5 w-3.5 text-muted" />
              Share link
            </button>
          </div>
        ) : null}
      </div>

      {busy ? (
        <p className="text-xs text-muted">Translating…</p>
      ) : null}
      {shareUrl ? (
        <div className="basis-full rounded-md border border-border bg-card px-3 py-2 text-xs">
          <p className="text-muted">
            Link ready
            {copied ? " · copied" : ""} ·{" "}
            <Link
              href="/sharing"
              className="text-accent underline-offset-2 hover:underline"
            >
              Manage shares
            </Link>
          </p>
          <p className="mt-1 break-all font-mono">{shareUrl}</p>
        </div>
      ) : null}
      {error ? <p className="basis-full text-sm text-danger">{error}</p> : null}
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
