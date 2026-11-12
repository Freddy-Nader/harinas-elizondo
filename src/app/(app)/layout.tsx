import Link from "next/link";
import { Suspense } from "react";
import { AppNavSkeleton } from "@/components/app-nav";
import { MobileNavFallback } from "@/components/mobile-nav";
import { SessionMobileNav, SessionNav, UserMenu } from "@/components/session-chrome";

// Static shell. The nav and the user menu read the session (RF-01), so they stream in
// behind <Suspense> instead of blocking the layout (Cache Components, see docs/llm/architecture.md).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 md:flex">
        <Brand />
        <Suspense fallback={<AppNavSkeleton />}>
          <SessionNav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>
      {/* Below md the sidebar is hidden, so the header carries a menu button that opens the
          same role-filtered nav and the user menu in a panel (status step 8b) */}
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background px-2 py-1.5 md:hidden">
        <Suspense fallback={<MobileNavFallback />}>
          <SessionMobileNav />
        </Suspense>
        <Brand />
      </header>
      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/panel" className="px-2.5">
      <span className="block text-sm font-semibold tracking-tight">Harinas Elizondo</span>
      <span className="block text-xs text-muted-foreground">Control de laboratorio</span>
    </Link>
  );
}
