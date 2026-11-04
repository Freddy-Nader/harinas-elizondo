"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** RF-01. Shows only the modules the role can open. */
export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = [
    { href: "/panel", title: "Panel" },
    ...MODULES.filter((mod) => mod.roles.includes(role)),
  ];

  return (
    <nav aria-label="Módulos" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

/** Placeholder while the session streams in, so the shell stays static. */
export function AppNavSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-0.5">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="px-2.5 py-1.5">
          <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
