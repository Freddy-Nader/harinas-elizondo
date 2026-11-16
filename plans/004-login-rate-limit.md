# Plan 004: Shared login rate limit and a stronger demo password

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- src/lib/auth.ts src/lib/db/auth-schema.ts scripts/seed.ts drizzle/`
> On a change, compare with "Current state" and STOP on a mismatch.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (adds a migration to the shared Neon database)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

Production is public and has two demo accounts (`laboratorio@demo.test`, `consulta@demo.test`) that share one seed password, which `scripts/seed.ts` only requires to be 8 characters. Better Auth (1.7.12) rate-limits sign-in by default in production, but it keeps the counters in memory, and on Vercel every serverless instance has its own memory, so a guessing script spread over instances is barely slowed. Storing the counters in Postgres makes the limit real.

## Current state

- `src/lib/auth.ts` builds `betterAuth({...})` with `emailAndPassword: { enabled: true, disableSignUp: true }`, `user.additionalFields`, `plugins: [nextCookies()]`, and no `rateLimit` key.
- `src/lib/db/auth-schema.ts` holds `user`, `session`, `account`, `verification` (Drizzle). Migrations in `drizzle/0000` to `0004`, journal in `drizzle/meta/_journal.json`.
- `scripts/seed.ts:24-27`:

```ts
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  throw new Error("SEED_PASSWORD (8+ chars) is not set in .env.local");
}
```

- Runbook for migrations and env: `docs/llm/runbook.md`. Never print secret values, never commit `.env*`.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Better Auth docs | `ls node_modules/better-auth/dist` and search for `rateLimit` and `storage: "database"` | find the option and the table it needs |
| Generate migration | `pnpm db:generate` | new `drizzle/0005_*.sql` |
| Unit tests | `pnpm test` | all pass |
| Checks | `pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope**: `src/lib/auth.ts`, `src/lib/db/auth-schema.ts`, new `drizzle/0005_*.sql` and its meta files, `scripts/seed.ts` (length check only), `docs/llm/runbook.md`, `docs/llm/decisions.md` (new D-28 row), `docs/llm/status.md`.

**Out of scope**: changing the demo password value itself (Freddy does that, it is a secret), applying the migration to Neon (Freddy runs `pnpm db:migrate` after review), any UI change.

## Git workflow

Branch `fix/login-rate-limit` from team `main`. Commit `fix(auth): store sign-in rate limits in Postgres (RF-01)`. Do not push unless told.

## Steps

### Step 1: Read how Better Auth stores rate limits

In `node_modules/better-auth`, find the `rateLimit` options type (`BetterAuthRateLimitOptions`) and the schema of the `rateLimit` model used with `storage: "database"` (fields like `key`, `count`, `lastRequest`).

**Verify**: you can name the table and its columns. If `storage: "database"` does not exist in 1.7.12, STOP.

### Step 2: Add the table and the option

Add the table to `auth-schema.ts` following the style of `verification` in the same file. In `auth.ts` add:

```ts
rateLimit: {
  enabled: true,
  storage: "database",
  window: 60,
  max: 100,
  customRules: { "/sign-in/email": { window: 60, max: 5 } },
},
```

Then `pnpm db:generate`.

**Verify**: a new `drizzle/0005_*.sql` that only has `CREATE TABLE` (no `DROP`, no `ALTER` of other tables). `pnpm typecheck` → exit 0.

### Step 3: Stronger seed password rule

Change the seed check to 16 characters and its message to say so.

**Verify**: `grep -n "16" scripts/seed.ts` shows the new check.

### Step 4: Docs

Add D-28 to `docs/llm/decisions.md` (date, decision, why). In `docs/llm/runbook.md` say the migration must be applied with `pnpm db:migrate` and the demo password rotated to 16+ characters with `pnpm db:seed` (the seed is idempotent, check that it updates the hash; if it does not, say so in the runbook instead of changing the seed logic). Update `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test && pnpm build` → exit 0.

## Test plan

- If the component suite runs (Docker, see `docs/testing/README.md`), the new migration applies on a clean `_test` database: `pnpm test:int` passes.
- Manual check after Freddy applies it locally: six wrong sign-ins in a minute against `http://localhost:3000/api/auth/sign-in/email` with `NODE_ENV=production pnpm start` → the sixth answers HTTP 429.

## Done criteria

- [ ] `rateLimit` with `storage: "database"` in `src/lib/auth.ts`
- [ ] One new additive migration
- [ ] Seed requires 16+ characters
- [ ] D-28 recorded, runbook updated
- [ ] All checks exit 0
- [ ] `plans/README.md` row 004 updated, with a note that Freddy must run the migration and rotate the password

## STOP conditions

- The generated migration touches existing tables.
- Better Auth needs a different table name than the one you added, or the option is missing.
- You would need a secret value to finish a step.

## Maintenance notes

The `rate_limit` table grows with keys per IP and path. Better Auth reuses rows per key, so it stays small. If the app ever moves behind another proxy, check which header Better Auth uses for the client IP.
