"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";

/** Tailwind `md`. From this width up the sidebar is visible and the panel must not stay open. */
const DESKTOP_QUERY = "(min-width: 48rem)";

const triggerClass = "size-11 active:scale-[0.97]";

/**
 * RF-01. Navigation for screens below `md` (status step 8b). A menu button opens a panel
 * from the left edge, where the desktop sidebar lives, with the same role-filtered links
 * (`AppNav`) and the user menu passed as `children`.
 *
 * Base UI's Drawer (D-04) gives the dialog semantics: focus moves into the panel and is
 * trapped there, Escape and the backdrop close it, focus returns to the button, and a
 * swipe to the left dismisses it along the path it came in.
 */
export function MobileNav({ role, children }: { role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Rotating a tablet or widening the window past `md` shows the sidebar, so close the panel.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="left">
      <Drawer.Trigger
        render={<Button variant="ghost" size="icon" className={triggerClass} />}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={[
            "fixed inset-0 z-40 min-h-dvh bg-black md:hidden",
            "opacity-[calc(0.3*(1-var(--drawer-swipe-progress)))] dark:opacity-[calc(0.6*(1-var(--drawer-swipe-progress)))]",
            "transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*200ms)]",
          ].join(" ")}
        />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-start md:hidden">
          {/* The panel is 3rem wider than it looks and pulled off-screen by the same amount,
              so an over-swipe to the right never shows a gap at the edge. */}
          <Drawer.Popup
            className={[
              "-ml-12 h-full w-[calc(18rem+3rem)] max-w-[calc(100vw-3rem+3rem)] pl-12",
              "overflow-y-auto overscroll-contain border-r bg-sidebar text-sidebar-foreground shadow-xl outline-none",
              "[transform:translateX(var(--drawer-swipe-movement-x))] will-change-transform",
              "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "data-swiping:select-none",
              "data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]",
              // Leaving is quicker than entering, and quicker still after a fast swipe
              "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*200ms)]",
              // Reduced motion: no slide, a short fade instead
              "motion-reduce:duration-150 motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0",
              "motion-reduce:data-starting-style:[transform:none] motion-reduce:data-ending-style:[transform:none]",
            ].join(" ")}
          >
            <Drawer.Content className="flex min-h-full flex-col gap-4 px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between gap-2 pl-2.5">
                <div>
                  <Drawer.Title className="text-sm font-semibold tracking-tight">Harinas Elizondo</Drawer.Title>
                  <Drawer.Description className="text-xs text-muted-foreground">
                    Control de laboratorio
                  </Drawer.Description>
                </div>
                <Drawer.Close
                  render={<Button variant="ghost" size="icon" className={triggerClass} />}
                  aria-label="Cerrar menú"
                >
                  <X className="size-5" />
                </Drawer.Close>
              </div>
              <AppNav role={role} touch onNavigate={() => setOpen(false)} />
              <div className="mt-auto border-t pt-4">{children}</div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Same footprint as the menu button while the session streams in, so the header does not shift. */
export function MobileNavFallback() {
  return (
    <Button variant="ghost" size="icon" className={triggerClass} disabled aria-label="Abrir menú">
      <Menu className="size-5" />
    </Button>
  );
}
