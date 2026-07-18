"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type AppliedProfile = {
  data: unknown;
  completeness: unknown;
  version: number;
  selectedLocale?: string;
};

export function PatchConfirm({
  profileId,
  patch,
  version,
  onApplied,
}: {
  profileId: string;
  patch: Record<string, unknown>;
  version: number;
  onApplied: (profile: AppliedProfile) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          version,
          patch,
          confirmAiSuggestions: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to apply patch");
        return;
      }
      onApplied({
        data: json.profile.data,
        completeness: json.profile.completeness,
        version: json.profile.version,
        selectedLocale: json.profile.selectedLocale,
      });
      setDismissed(true);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
      <p className="text-sm font-medium">Suggested resume update</p>
      <pre className="mt-2 max-h-40 overflow-auto rounded bg-card p-2 text-xs">
        {JSON.stringify(patch, null, 2)}
      </pre>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={apply} disabled={busy}>
          {busy ? "Saving & translating…" : "Confirm & apply"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
          disabled={busy}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
