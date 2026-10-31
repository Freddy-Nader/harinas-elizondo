import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULES } from "@/lib/modules";

export default function PanelPage() {
  return (
    <section className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">
          Emisión de certificados de calidad de harina de trigo, desde el lote hasta el envío.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <li key={mod.href}>
            <Link
              href={mod.href}
              className="block h-full rounded-xl transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              <Card className="h-full transition-colors duration-150 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{mod.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{mod.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
