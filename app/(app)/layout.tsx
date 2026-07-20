import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { DesktopPreferredShell } from "@/components/layout/desktop-preferred-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <DesktopPreferredShell>
      <div className="min-h-screen print:min-h-0">
        <header className="border-b border-border/80 bg-card/70 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <Link
                href="/resumes"
                className="inline-flex items-center hover:opacity-90"
              >
                <BrandWordmark markSize={22} />
              </Link>
              <AppHeaderNav />
            </div>
            <AccountMenu />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </DesktopPreferredShell>
  );
}
