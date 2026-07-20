"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/applications", label: "Applications" },
  { href: "/resumes", label: "Resumes" },
  { href: "/sharing", label: "Sharing" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppHeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
      {links.map((l) => {
        const active =
          pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-accent !text-white hover:opacity-90"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
