"use client";

import { BrandMark } from "@/components/brand/brand-mark";
import { APP_NAME } from "@/lib/brand";

/**
 * Resume editing (chat + A4 side-by-side) needs a wide desktop viewport.
 * Phone and tablet sizes get a clear message instead of a cramped layout.
 */
export function DesktopPreferredShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center xl:hidden print:hidden">
        <BrandMark size={72} className="rounded-2xl shadow-sm" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {APP_NAME}
        </h1>
        <p className="mt-3 max-w-sm text-muted">
          This app is built for a desktop browser — chat, preview, and editing
          need a larger screen.
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Please open it on a computer to continue.
        </p>
      </div>
      <div className="hidden xl:contents print:contents">{children}</div>
    </>
  );
}
