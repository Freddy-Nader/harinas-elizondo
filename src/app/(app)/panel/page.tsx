import Link from "next/link";
import { Suspense } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default function PanelPage() {
  return (
    <section className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1 rounded-2xl border border-blue-900/15 bg-blue-50/60 p-5 dark:bg-blue-950/25 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">
          Emisión de certificados de calidad de harina de trigo, desde el lote hasta el envío.
        </p>
      </header>
      <Suspense fallback={<ModuleGridSkeleton />}>
        <ModuleGrid />
      </Suspense>
    </section>
  );
}

/** RF-01. Only the modules the signed-in role can open. */
async function ModuleGrid() {
  const user = await requireUser();
  const modules = MODULES.filter((mod) => mod.roles.includes(user.role));

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => (
        <li key={mod.href}>
          <Link
            href={mod.href}
            className="block h-full rounded-xl transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            <Card className="h-full transition-colors duration-150 hover:bg-blue-50/70 dark:hover:bg-blue-950/30">
              <CardHeader>
                <CardTitle>{mod.title}</CardTitle>
                <CardDescription className="line-clamp-3">{mod.summary}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ModuleGridSkeleton() {
  return (
    <div aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  );
}
