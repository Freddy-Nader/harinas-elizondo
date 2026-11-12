import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

/**
 * Session-dependent parts of the shell (RF-01). Each one reads the user, so the
 * layout renders them inside <Suspense>. `requireUser` is deduplicated per request.
 */
export async function SessionNav() {
  const user = await requireUser();
  return <AppNav role={user.role} />;
}

/**
 * Menu button plus slide-in panel for screens below `md` (RF-01). It gets the same role
 * as the sidebar, and the user menu is passed in already rendered on the server.
 */
export async function SessionMobileNav() {
  const user = await requireUser();
  return (
    <MobileNav role={user.role}>
      <UserMenu />
    </MobileNav>
  );
}

export async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2 px-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ROLE_LABELS[user.role]}
          {user.employeeId ? ` · ${user.employeeId}` : ""}
        </p>
      </div>
      <SignOutButton />
    </div>
  );
}
