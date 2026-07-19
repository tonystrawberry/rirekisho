import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { APP_NAME } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <BrandMark size={56} className="rounded-xl" decorative />
      <p className="mt-4 text-sm font-medium text-muted">{APP_NAME}</p>
      <p className="mt-6 font-mono text-6xl font-semibold tracking-tight text-foreground/20 sm:text-7xl">
        404
      </p>
      <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        This page doesn’t exist
      </h1>
      <p className="mt-4 max-w-md text-muted">
        The link may be wrong, expired, or the shared resume was revoked.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/resumes"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-surface"
        >
          Your resumes
        </Link>
      </div>
    </main>
  );
}
