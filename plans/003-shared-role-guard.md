# Plan 003: One shared role guard for every server action

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 89aa184..HEAD -- src/lib/session.ts "src/app/(app)/clientes/actions.ts" "src/app/(app)/clientes/actions.test.ts" "src/app/(app)/certificados/actions.ts" "src/app/(app)/equipos/actions.ts" "src/app/(app)/lotes/actions.ts"`
> On a change, compare with "Current state" and STOP on a mismatch.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (behavior stays the same, tests prove it)
- **Depends on**: none. Plan 008 (shared API and CLI) builds on this guard
- **Category**: tech-debt, security
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

Role checks (RF-01) live in four places. `src/lib/session.ts` has the real `requireRole`, three action files copy the same `authorize()` wrapper, and Clientes re-implements the check by reading the session itself. The Clientes copy skips the "unknown role gets least privilege" rule of `getCurrentUser` and throws a plain `Error`. One guard means one place to audit, and plan 008 needs it to call the same use cases from an HTTP API.

## Current state

- `src/lib/session.ts` exports `requireRole(...roles)` (redirects to `/login` without a session, throws `ForbiddenError` with "No tienes permiso para realizar esta acción." on a wrong role) and `ForbiddenError`.
- The same helper is copied in `src/app/(app)/certificados/actions.ts:40`, `src/app/(app)/equipos/actions.ts:53`, `src/app/(app)/lotes/actions.ts:18`:

```ts
async function authorize() {
  try {
    return { user: await requireRole() };
  } catch (error) {
    if (error instanceof ForbiddenError) return { denied: fail(error.message) };
    throw error;
  }
}
```

Callers use it as `const { user, denied } = await authorize(); if (denied) return denied;`.

- `src/app/(app)/clientes/actions.ts:15`:

```ts
async function requireTransactionUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user || session.user.active === false) redirect("/login");
  if (session.user.role !== "transaction") throw new Error("Acceso restringido.");
  return session.user;
}
```

Its callers (`saveClient`, `changeClientStatus`, `saveClientLimit`, `removeClientLimit`) take `FormData` directly (no `ActionState`), use `user.id`, `user.name`, `user.employeeId`, and redirect on validation errors.

- `src/app/(app)/clientes/actions.test.ts` mocks `@/lib/auth` `getAuth().api.getSession` and `next/headers`, and expects the message "Acceso restringido." for query users (line 54).

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Unit tests | `pnpm test` | all pass (197 or more) |
| One file | `pnpm exec vitest run "src/app/(app)/clientes"` | all pass |
| Checks | `pnpm typecheck && pnpm lint && pnpm build` | exit 0 |
| Component tests (optional, needs Docker) | see `docs/testing/README.md` | all pass |

## Scope

**In scope**: `src/lib/session.ts`, the four action files above, `src/app/(app)/clientes/actions.test.ts`.
**Out of scope**: `src/app/(app)/usuarios/actions.ts`, `inspecciones/actions.ts`, `reportes/actions.ts` (they already call `requireRole` directly and are fine). Do not change any user-facing message except the Clientes forbidden message.

## Git workflow

Branch `refactor/shared-role-guard` from team `main`. Commit `refactor(auth): share one role guard across server actions (RF-01)`. Do not push unless told.

## Steps

### Step 1: Export the wrapper from session.ts

Add to `src/lib/session.ts` (import `fail` and `ActionState` from `@/lib/action-state`):

```ts
/** RF-01. `requireRole` for form actions: a wrong role becomes a failed ActionState, not a throw. */
export async function authorizeMutation(
  ...roles: Role[]
): Promise<{ user: SessionUser; denied?: undefined } | { user?: undefined; denied: ActionState }> {
  try {
    return { user: await requireRole(...roles) };
  } catch (error) {
    if (error instanceof ForbiddenError) return { denied: fail(error.message) };
    throw error;
  }
}
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Replace the three copies

In certificados, equipos and lotes actions, delete the local `authorize()` and replace each `await authorize()` with `await authorizeMutation()`. Remove imports that become unused (`ForbiddenError`, maybe `fail`).

**Verify**: `grep -rn "async function authorize" src` → no match. `pnpm typecheck && pnpm lint && pnpm test` → exit 0.

### Step 3: Clientes uses requireRole

In `clientes/actions.ts` delete `requireTransactionUser` and call `const user = await requireRole();` (import from `@/lib/session`). Remove the now unused `headers` and `getAuth` imports. `SessionUser` has `id`, `name`, `employeeId`, which is all `logChange` and the inserts use.

Update `clientes/actions.test.ts` so the mock still drives the session. `requireRole` calls `getCurrentUser`, which calls `getAuth().api.getSession`, so the existing `@/lib/auth` mock keeps working, but `getCurrentUser` is wrapped in React `cache` and imports `server-only`. If the test fails on `server-only`, add `vi.mock("server-only", () => ({}))`. Change the expected message on line 54 to "No tienes permiso para realizar esta acción.".

**Verify**: `pnpm exec vitest run "src/app/(app)/clientes"` → all pass. `grep -n "requireTransactionUser" -r src` → no match.

### Step 4: Full checks

**Verify**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → exit 0.

## Test plan

- Existing tests are the safety net. Clientes unauthenticated → `REDIRECT:/login`, query role → forbidden message, and `getDb` never called. Keep both cases.
- Add one test in `src/lib/session.test.ts` (create it, mock `@/lib/auth` and `next/headers` the way `clientes/actions.test.ts` does) that `authorizeMutation()` returns `{ denied: { ok: false, message: "No tienes permiso para realizar esta acción." } }` for a query user and `{ user }` for a transaction user.

## Done criteria

- [ ] `grep -rn "async function authorize\|requireTransactionUser" src` → no match
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0
- [ ] New `authorizeMutation` test passes
- [ ] Only in-scope files changed (`git status`)
- [ ] `plans/README.md` row 003 updated

## STOP conditions

- An action relied on Clientes' plain `Error` (for example an error boundary that matches "Acceso restringido.").
- `requireRole` cannot run under Vitest even with `server-only` mocked.
- Any component test (`*.int.test.ts`) starts failing.

## Maintenance notes

New server actions call `authorizeMutation()` (form actions) or `requireRole()` (loaders). Reviewers should reject any new local copy of a role check.
