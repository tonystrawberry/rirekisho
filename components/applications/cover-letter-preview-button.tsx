"use client";

import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CoverLetterFrame } from "@/components/applications/cover-letter-frame";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import type { CoverLetterTemplateId } from "@/lib/cover-letter/templates";
import { printCoverLetter } from "@/lib/cover-letter/print";

export function FullscreenCoverLetterPreviewButton({
  open,
  onOpenChange,
  content,
  subject,
  identity,
  meta,
  templateId,
  locale,
  primaryColor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  subject: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
  templateId: CoverLetterTemplateId;
  locale: string;
  primaryColor: string;
}) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 px-0"
        onClick={() => onOpenChange(true)}
        title="Full screen preview"
        aria-label="Full screen preview"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="a4-fullscreen-dialog flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 flex-col gap-0 rounded-none border-0 bg-[#e8eef3] p-0 shadow-none"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 py-3 backdrop-blur print:hidden">
            <div>
              <DialogTitle className="text-base font-semibold">
                Cover letter preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted">
                Press Esc to close · use Print for PDF
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const scroller = document.querySelector(
                    ".a4-fullscreen-preview",
                  );
                  if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
                  printCoverLetter();
                }}
              >
                Print / PDF
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="a4-fullscreen-preview min-h-0 flex-1 overflow-auto px-4 py-6 print:overflow-visible print:bg-white print:p-0">
            <div className="cover-letter-print-root mx-auto w-full max-w-[210mm] print:max-w-none">
              <CoverLetterFrame
                content={content}
                subject={subject}
                identity={identity}
                meta={meta}
                templateId={templateId}
                locale={locale}
                primaryColor={primaryColor}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
