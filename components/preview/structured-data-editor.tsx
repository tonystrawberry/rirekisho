"use client";

import { useEffect, useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeCompleteness } from "@/lib/resume/completeness";
import {
  masterResumeSchema,
  type MasterResume,
} from "@/lib/resume/schema";

function prettyJson(data: MasterResume) {
  return JSON.stringify(data, null, 2);
}

export function StructuredDataEditorButton({
  open,
  onOpenChange,
  data,
  disabled,
  disabledReason,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MasterResume;
  disabled?: boolean;
  disabledReason?: string;
  onSave: (data: MasterResume) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(() => prettyJson(data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(prettyJson(data));
      setError(null);
    }
  }, [open, data]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(draft);
      } catch {
        setError("Invalid JSON — check commas, quotes, and brackets");
        return;
      }
      const parsed = masterResumeSchema.safeParse(parsedJson);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setError(
          first
            ? `${first.path.join(".") || "root"}: ${first.message}`
            : "Resume data failed schema validation",
        );
        return;
      }
      const completeness = computeCompleteness(parsed.data);
      const next: MasterResume = {
        ...parsed.data,
        meta: {
          ...parsed.data.meta,
          schemaVersion: 1,
          gaps: completeness.gaps,
          lastEnrichedAt: new Date().toISOString(),
        },
      };
      await onSave(next);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 px-0"
        disabled={disabled}
        title={disabled ? disabledReason : "Edit structured resume JSON"}
        aria-label="Edit structured resume JSON"
        onClick={() => onOpenChange(true)}
      >
        <Braces className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90dvh] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Structured resume data</DialogTitle>
            <DialogDescription>
              Edit the master resume JSON directly. Invalid JSON or schema
              errors will be blocked on save.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Tab") return;
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const indent = "  ";
                const next =
                  draft.slice(0, start) + indent + draft.slice(end);
                setDraft(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + indent.length;
                });
              }}
              spellCheck={false}
              disabled={busy}
              className="min-h-[min(60dvh,32rem)] resize-y font-mono text-xs leading-relaxed"
            />
            {error ? (
              <p className="mt-3 text-sm text-danger">{error}</p>
            ) : (
              <p className="mt-3 text-xs text-muted">
                Tip: keep stable item <code className="text-foreground">id</code>{" "}
                values when editing experience, education, skills, etc.
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDraft(prettyJson(data));
                setError(null);
              }}
            >
              Reset
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save JSON"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
