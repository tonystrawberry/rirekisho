"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small × control for removing preview entries / sections (edit mode only). */
export function PreviewDeleteButton({
  label,
  onDelete,
  className,
}: {
  label: string;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-sm leading-none text-muted transition-colors",
        "hover:bg-destructive/10 hover:text-destructive",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "print:hidden",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
      }}
    >
      ×
    </button>
  );
}

/** Wraps a preview block with a hover-revealed delete control. */
export function DeletablePreviewBlock({
  canEdit,
  label,
  onDelete,
  className,
  as: Tag = "div",
  children,
}: {
  canEdit: boolean;
  label: string;
  onDelete: () => void;
  className?: string;
  as?: ElementType;
  children: ReactNode;
}) {
  if (!canEdit) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag className={cn("group/del relative", className)}>
      <PreviewDeleteButton
        label={label}
        onDelete={onDelete}
        className="absolute -right-1 -top-1 z-10 opacity-0 group-hover/del:opacity-100 focus-visible:opacity-100"
      />
      {children}
    </Tag>
  );
}

/** Section heading with optional “clear this whole section” control. */
export function PreviewSectionTitle({
  title,
  canEdit,
  onDeleteSection,
  className,
  keepWithNext,
}: {
  title: string;
  canEdit?: boolean;
  onDeleteSection?: () => void;
  className?: string;
  keepWithNext?: boolean;
}) {
  return (
    <h2
      data-resume-block
      {...(keepWithNext ? { "data-resume-keep-with-next": true } : {})}
      className={cn("group/sec flex items-center gap-1.5", className)}
    >
      <span>{title}</span>
      {canEdit && onDeleteSection ? (
        <PreviewDeleteButton
          label={`Remove ${title} section`}
          onDelete={onDeleteSection}
          className="opacity-0 group-hover/sec:opacity-100 focus-visible:opacity-100"
        />
      ) : null}
    </h2>
  );
}
