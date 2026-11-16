# Plan 002: Move the shadcn CLI out of runtime dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- package.json pnpm-lock.yaml src/app/globals.css`
> On a change, compare with "Current state" and STOP on a mismatch.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security, dependencies
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

`pnpm audit --prod` reports 12 advisories (1 high, 9 moderate, 2 low). Ten of them come from `shadcn > @modelcontextprotocol/sdk > express/hono`, which is a CLI the app never runs. The app only uses the package for one CSS import at build time. Moving it to `devDependencies` makes the production audit honest, so a real advisory is not lost among false alarms.

## Current state

- `package.json` line 38, inside `"dependencies"`: `"shadcn": "^4.22.1",`
- `src/app/globals.css` line 3: `@import "shadcn/tailwind.css";` (build time only)
- No `.ts`/`.tsx` file imports `shadcn`. Confirm with `grep -rn "from \"shadcn" src` (expected no match).
- Vercel and CI run `pnpm install` with dev dependencies before `pnpm build`, so the CSS import still resolves.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Move | `pnpm remove shadcn && pnpm add -D shadcn@^4.22.1` | exit 0 |
| Audit | `pnpm audit --prod` | no advisory whose path starts with `.>shadcn` |
| Checks | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | exit 0 |

## Scope

**In scope**: `package.json`, `pnpm-lock.yaml`.
**Out of scope**: upgrading any other package, `components.json`, the UI components.

## Git workflow

Branch `chore/shadcn-dev-dependency` from team `main`. Commit `chore(deps): move shadcn CLI to devDependencies`. Do not push unless told.

## Steps

### Step 1: Move the package

Run `pnpm remove shadcn && pnpm add -D shadcn@^4.22.1`.

**Verify**: `node -e "const p=require('./package.json');console.log(!!p.devDependencies.shadcn, !!p.dependencies.shadcn)"` → `true false`.

### Step 2: Build and audit

**Verify**: `pnpm build` → exit 0 and the app styles still compile. `pnpm audit --prod | grep -c 'shadcn'` → `0`.

### Step 3: Full checks

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0.

## Test plan

No new tests. The build proves the CSS import still resolves. Open `/login` with `pnpm dev` and confirm it is styled (buttons rounded, brand colors).

## Done criteria

- [ ] `shadcn` only under `devDependencies`
- [ ] `pnpm audit --prod` lists no `.>shadcn` path
- [ ] All four checks exit 0
- [ ] `plans/README.md` row 002 updated

## STOP conditions

- `pnpm build` fails to resolve `shadcn/tailwind.css`.
- A runtime file imports from `shadcn`.

## Maintenance notes

`pnpm dlx shadcn add <component>` keeps working from devDependencies. Remaining advisories (`exceljs > uuid`, `better-auth > drizzle-kit > esbuild`) are not reachable at runtime and wait for upstream releases.
