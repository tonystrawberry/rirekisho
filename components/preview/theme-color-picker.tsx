"use client";

import { useState } from "react";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
} from "@/lib/resume/theme-color";
import { cn } from "@/lib/utils";

export function ThemeColorPicker({
  profileId,
  value,
  onChange,
}: {
  profileId: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const color = normalizePrimaryColor(value) ?? DEFAULT_PRIMARY_COLOR;

  async function pick(next: string) {
    const normalized = normalizePrimaryColor(next);
    if (!normalized) return;
    setBusy(true);
    try {
      onChange(normalized);
      await fetch("/api/preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, primaryColor: normalized }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={cn(
        "relative inline-block h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border",
        busy && "opacity-50",
      )}
      style={{ backgroundColor: color }}
      title={`Resume color ${color}`}
    >
      <span className="sr-only">Resume primary color</span>
      <input
        type="color"
        value={color}
        disabled={busy}
        onChange={(e) => void pick(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Resume primary color"
      />
    </label>
  );
}
