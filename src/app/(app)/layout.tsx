import Link from "next/link";
import { AppNav } from "@/components/app-nav";

// Static shell. Session reads (RF-01) go inside <Suspense> in the pages,
// never at the top of this layout (Cache Components, see docs/llm/architecture.md).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 md:flex">
        <Link href="/panel" className="px-2.5">
          <span className="block text-sm font-semibold tracking-tight">Harinas Elizondo</span>
          <span className="block text-xs text-muted-foreground">Control de laboratorio</span>
        </Link>
        <AppNav />
      </aside>
      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
