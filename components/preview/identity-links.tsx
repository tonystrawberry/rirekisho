"use client";

import { InlineText } from "@/components/preview/inline-text";
import { PreviewDeleteButton } from "@/components/preview/preview-delete";
import {
  formatLinkDisplay,
  normalizeWebsiteUrl,
  type IdentityLink,
} from "@/lib/resume/identity-links";
import { cn } from "@/lib/utils";

export type { IdentityLink };
export { formatLinkDisplay, formatIdentityLinksForMeta } from "@/lib/resume/identity-links";

/**
 * Website / profile links in the resume header.
 * Supports add, edit URL, and remove when `canEdit` is true.
 */
export function IdentityLinksRow({
  links,
  canEdit,
  onChange,
  className,
  inputClassName,
  separatorClassName,
}: {
  links: IdentityLink[] | undefined;
  canEdit: boolean;
  onChange?: (next: IdentityLink[]) => void;
  className?: string;
  inputClassName?: string;
  separatorClassName?: string;
}) {
  const items = links ?? [];

  function commitLinks(next: IdentityLink[]) {
    onChange?.(next);
  }

  function updateUrl(index: number, raw: string) {
    const url = normalizeWebsiteUrl(raw);
    if (!url) {
      commitLinks(items.filter((_, i) => i !== index));
      return;
    }
    const next = items.map((link, i) =>
      i === index ? { ...link, url, label: link.label || "Website" } : link,
    );
    commitLinks(next);
  }

  function addUrl(raw: string) {
    const url = normalizeWebsiteUrl(raw);
    if (!url) return;
    if (items.some((l) => l.url === url)) return;
    commitLinks([...items, { label: "Website", url }]);
  }

  if (!items.length && !canEdit) return null;

  return (
    <>
      {items.map((link, index) => (
        <span
          key={`${link.url}-${index}`}
          className={cn(
            "group/link inline-flex max-w-full items-baseline gap-0.5",
            className,
          )}
        >
          <span
            className={cn("text-border", separatorClassName, "print:inline")}
          >
            ·
          </span>
          {canEdit ? (
            <>
              <InlineText
                value={link.url}
                editable
                className="max-w-[14rem] truncate"
                inputClassName={inputClassName}
                emptyLabel="website"
                placeholder="https://yoursite.com"
                onCommit={(url) => updateUrl(index, url)}
              />
              <PreviewDeleteButton
                label="Remove website"
                className="opacity-0 group-hover/link:opacity-100 focus-visible:opacity-100"
                onDelete={() =>
                  commitLinks(items.filter((_, i) => i !== index))
                }
              />
            </>
          ) : (
            <a
              href={normalizeWebsiteUrl(link.url) || link.url}
              target="_blank"
              rel="noreferrer"
              className="max-w-[14rem] truncate underline-offset-2 hover:underline"
            >
              {formatLinkDisplay(link)}
            </a>
          )}
        </span>
      ))}
      {canEdit ? (
        <span className={cn("inline-flex items-baseline gap-0.5", className)}>
          <span className={cn("text-border print:hidden", separatorClassName)}>
            ·
          </span>
          <InlineText
            value=""
            editable
            emptyLabel="+ Website"
            placeholder="https://yoursite.com"
            inputClassName={inputClassName}
            onCommit={addUrl}
          />
        </span>
      ) : null}
    </>
  );
}
