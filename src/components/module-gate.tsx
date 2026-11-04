import { canAccess } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

/**
 * RF-01. Renders the module only for roles listed in modules.ts. Hiding is not
 * enough on its own, so server actions still call `requireRole`.
 * Reads the session, so render it inside <Suspense>.
 */
export async function ModuleGate({ href, children }: { href: string; children: React.ReactNode }) {
  const user = await requireUser();
  if (!canAccess(user.role, href)) return <AccessDenied />;
  return children;
}

export function AccessDenied() {
  return (
    <section className="flex max-w-xl flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Acceso restringido</h1>
      <p className="text-pretty text-muted-foreground">
        Tu perfil es de consulta. Puedes revisar los reportes y la bitácora, pero este módulo
        solo está disponible para usuarios de transacción.
      </p>
    </section>
  );
}

/** Fallback while the gate reads the session. */
export function PageSkeleton() {
  return (
    <div aria-hidden className="flex max-w-2xl flex-col gap-3">
      <div className="h-7 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
    </div>
  );
}
