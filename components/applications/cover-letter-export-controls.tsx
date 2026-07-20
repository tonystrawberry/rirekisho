"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileDown, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CoverLetterExportControls({
  applicationId,
  locale,
  disabled = false,
  onPrint,
}: {
  applicationId: string;
  locale: string;
  disabled?: boolean;
  /** Called for PDF — typically open fullscreen preview then print, or print in place. */
  onPrint: () => void;
}) {
  const [shareBusy, setShareBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  async function share() {
    if (disabled || shareBusy || docxBusy) return;
    setMenuOpen(false);
    setShareBusy(true);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/cover-letter/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message || "Share failed");
        return;
      }
      const path = json.link?.path as string;
      const url =
        typeof json.link?.url === "string" && json.link.url.startsWith("http")
          ? (json.link.url as string)
          : `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setShareBusy(false);
    }
  }

  function exportPdf() {
    setMenuOpen(false);
    onPrint();
  }

  async function exportDocx() {
    if (disabled || shareBusy || docxBusy) return;
    setMenuOpen(false);
    setDocxBusy(true);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/cover-letter/export/docx`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error?.message || "Word export failed");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `cover-letter-${locale}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Word export failed");
    } finally {
      setDocxBusy(false);
    }
  }

  const anyBusy = shareBusy || docxBusy;

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="sm"
        variant="default"
        disabled={disabled || anyBusy}
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
            onClick={() => exportPdf()}
          >
            <FileDown className="h-3.5 w-3.5 text-muted" />
            PDF
            <span className="ml-auto text-[10px] text-muted">Print</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
            onClick={() => void exportDocx()}
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
  );
}
