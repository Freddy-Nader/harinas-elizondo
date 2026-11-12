import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { Suspense } from "react";
import { AppNavSkeleton } from "@/components/app-nav";
import { SessionNav, UserMenu } from "@/components/session-chrome";

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
      {/* Small screens get the user menu here until mobile navigation lands (status step 8b) */}
      <header className="flex items-center justify-between gap-4 border-b px-3 py-3 md:hidden">
        <Brand />
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/panel" className="flex items-center gap-3 px-2.5 md:flex-col md:gap-2 md:py-2 md:text-center">
      <BrandLogo className="w-12 shrink-0 md:w-36" />
      <div>
        <span className="block text-sm font-semibold tracking-tight md:text-base">Harinas Elizondo</span>
        <span className="block text-xs text-muted-foreground">Control de laboratorio</span>
      </div>
    </Link>
  );
}
