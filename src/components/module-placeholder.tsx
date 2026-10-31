import { Badge } from "@/components/ui/badge";
import { findModule } from "@/lib/modules";

/** Temporary page body for modules that are not built yet. */
export function ModulePlaceholder({ href }: { href: string }) {
  const mod = findModule(href);

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{mod.title}</h1>
          <Badge variant="secondary">En construcción</Badge>
        </div>
        <p className="text-pretty text-muted-foreground">{mod.summary}</p>
      </header>
      <dl className="flex gap-6 text-sm">
        <div>
          <dt className="text-muted-foreground">Requerimiento</dt>
          <dd className="font-mono">{mod.requirement}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Caso de uso</dt>
          <dd className="font-mono">{mod.useCase}</dd>
        </div>
      </dl>
    </section>
  );
}
