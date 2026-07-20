"use client";

import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { CoverLetterFrame } from "@/components/applications/cover-letter-frame";
import { APP_NAME } from "@/lib/brand";
import { printCoverLetter } from "@/lib/cover-letter/print";
import type { CoverLetterShareSnapshot } from "@/lib/cover-letter/share";
import { localeLanguageName } from "@/lib/resume/locales";

export function PublicCoverLetterView({
  snapshot,
  label,
}: {
  snapshot: CoverLetterShareSnapshot;
  label?: string | null;
}) {
  const title =
    label?.trim() ||
    snapshot.subject.trim() ||
    snapshot.identity.fullName ||
    "Cover letter";

  return (
    <div className="min-h-screen bg-surface/40">
      <header className="border-b border-border bg-card/80 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm text-muted">
              Shared via {APP_NAME} · {localeLanguageName(snapshot.locale)}
            </p>
            <h1 className="text-lg font-semibold tracking-tight [&_em]:italic [&_p]:m-0 [&_p]:inline [&_strong]:font-semibold">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {title}
              </ReactMarkdown>
            </h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => printCoverLetter()}
          >
            Print / Save PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[210mm] px-4 py-6 print:max-w-none print:p-0">
        <div className="cover-letter-print-root overflow-hidden rounded-xl bg-white print:overflow-visible print:rounded-none">
          <CoverLetterFrame
            content={snapshot.content}
            subject={snapshot.subject}
            identity={snapshot.identity}
            meta={snapshot.meta}
            templateId={snapshot.templateId}
            locale={snapshot.locale}
            primaryColor={snapshot.primaryColor}
          />
        </div>
      </main>
    </div>
  );
}
