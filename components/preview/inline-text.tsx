"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type InlineTextProps = {
  value: string;
  editable?: boolean;
  multiline?: boolean;
  className?: string;
  /** Classes applied while editing (input/textarea). */
  inputClassName?: string;
  placeholder?: string;
  /** Shown when value is empty and not editing (editable mode). */
  emptyLabel?: string;
  as?: "span" | "p" | "h1" | "h2" | "li";
  onCommit?: (next: string) => void | Promise<void>;
};

/**
 * Click-to-edit text for the resume preview.
 * Enter commits (Ctrl/Cmd+Enter for multiline); Escape cancels; blur commits.
 * Long or multi-line values open a textarea so the full text stays visible.
 */
export function InlineText({
  value,
  editable = false,
  multiline = false,
  className,
  inputClassName,
  placeholder = "Click to edit",
  emptyLabel,
  as: Tag = "span",
  onCommit,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const committingRef = useRef(false);
  const skipBlurRef = useRef(false);

  // Prefer a textarea for wrapped/long bullets even when callers omit `multiline`.
  const useMultiline =
    multiline || value.includes("\n") || value.trim().length > 48;

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editing]);

  if (!editable || !onCommit) {
    if (!value) return null;
    return (
      <Tag
        className={cn(className, useMultiline && "whitespace-pre-wrap")}
      >
        {value}
      </Tag>
    );
  }

  async function commit() {
    if (!onCommit || committingRef.current) return;
    const next = draft.trimEnd().trim();
    const prev = value;
    if (next === prev.trim()) {
      setEditing(false);
      setDraft(prev);
      return;
    }
    committingRef.current = true;
    setBusy(true);
    try {
      await onCommit(next);
      setEditing(false);
    } catch {
      setDraft(prev);
      // Stay in edit mode so the user can retry.
    } finally {
      setBusy(false);
      committingRef.current = false;
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      skipBlurRef.current = true;
      cancel();
      return;
    }
    if (e.key === "Enter" && (!useMultiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // Enter blurs the input; ignore that blur so we don't double-save
      // (second save hits a version conflict and can revert the UI).
      skipBlurRef.current = true;
      void commit();
    }
  }

  function onBlur() {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    void commit();
  }

  if (editing) {
    const shared = cn(
      "w-full rounded-sm bg-accent/5 outline-none ring-2 ring-accent/40 print:hidden",
      busy && "opacity-60",
      inputClassName ?? className,
    );
    if (useMultiline) {
      const newlineCount = draft.split("\n").length;
      const wrapEstimate = Math.ceil(Math.max(draft.length, 1) / 56);
      const rows = Math.min(14, Math.max(3, newlineCount, wrapEstimate));
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={cn(
            shared,
            "min-h-[4.5rem] resize-y px-1 py-0.5 leading-relaxed whitespace-pre-wrap",
          )}
          value={draft}
          disabled={busy}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          rows={rows}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        className={cn(shared, "px-1 py-0.5")}
        value={draft}
        disabled={busy}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    );
  }

  const display = value.trim() ? value : emptyLabel || placeholder;
  const isEmpty = !value.trim();

  return (
    <Tag
      className={cn(
        className,
        useMultiline && !isEmpty && "whitespace-pre-wrap",
        "cursor-text rounded-sm decoration-transparent transition-[box-shadow,background-color] hover:bg-accent/5 hover:ring-1 hover:ring-accent/25 print:bg-transparent print:ring-0",
        isEmpty && "text-muted italic print:hidden",
      )}
      role="button"
      tabIndex={0}
      title={
        useMultiline
          ? "Click to edit (Ctrl/⌘+Enter to save)"
          : "Click to edit"
      }
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      {display as ReactNode}
    </Tag>
  );
}
