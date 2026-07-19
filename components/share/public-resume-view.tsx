"use client";

import { Button } from "@/components/ui/button";
import { ResumeFrame } from "@/components/preview/resume-frame";
import { APP_NAME } from "@/lib/brand";
import type { MasterResume } from "@/lib/resume/schema";
import type { TemplateId } from "@/lib/resume/templates";
import { resumeThemeCssVars } from "@/lib/resume/theme-color";

export function PublicResumeView({
  data,
  templateId,
  locale,
  primaryColor,
  languageLabel,
  pdfUrl,
  label,
}: {
  data: MasterResume;
  templateId: TemplateId;
  locale: string;
  primaryColor: string;
  languageLabel: string;
  pdfUrl: string;
  label?: string | null;
}) {
  return (
    <div className="min-h-screen bg-surface/40">
      <header className="border-b border-border bg-card/80 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm text-muted">
              Shared via {APP_NAME} · {languageLabel}
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              {label || data.identity.fullName}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.open(pdfUrl, "_blank", "noopener,noreferrer");
              }}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
        <div
          className="resume-print-root resume-workspace-panel mx-auto overflow-auto rounded-xl border border-border bg-surface/70 p-3 shadow-sm print:overflow-visible print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none"
          style={resumeThemeCssVars(primaryColor)}
        >
          <ResumeFrame
            data={data}
            templateId={templateId}
            locale={locale}
            editable={false}
          />
        </div>
      </main>
    </div>
  );
}
