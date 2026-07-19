"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AccountMenu() {
  const { data } = useSession();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden items-baseline gap-1.5 sm:inline-flex">
        <span className="text-xs text-muted">Logged in as</span>
        <span className="text-sm font-semibold text-foreground">
          {data?.user?.email || data?.user?.name}
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </Button>
    </div>
  );
}
