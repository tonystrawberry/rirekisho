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
import { ResumeFrame } from "@/components/preview/resume-frame";
import { resumeThemeCssVars } from "@/lib/resume/theme-color";
import type { MasterResume } from "@/lib/resume/schema";
import type { TemplateId } from "@/lib/resume/templates";

export function FullscreenA4PreviewButton({
  open,
  onOpenChange,
  data,
  templateId,
  locale,
  primaryColor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MasterResume;
  templateId: TemplateId;
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
        title="Full screen A4 preview"
        aria-label="Full screen A4 preview"
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
                A4 preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted">
                Real 210×297mm page size · press Esc to close
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline" className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Close
              </Button>
            </DialogClose>
          </div>

          <div
            className="a4-fullscreen-preview min-h-0 flex-1 overflow-auto px-4 py-6"
            style={resumeThemeCssVars(primaryColor)}
          >
            <ResumeFrame
              data={data}
              templateId={templateId}
              locale={locale}
              editable={false}
              textEditable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
