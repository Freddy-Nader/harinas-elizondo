# Plan 010: A command that changes the password of an existing account

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 59b6b24..HEAD -- scripts/ package.json docs/llm/runbook.md src/lib/db/auth-schema.ts`
> On a change, compare with "Current state" and STOP on a mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (the operator will run it against the production database)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `59b6b24`, 2026-11-16

## Why this matters

Production is public and has two demo accounts that share one seed password. Plan 004 made the seed ask for 16 or more characters, but the seed skips users that already exist, and the app has no screen to change a password. So today nobody can rotate the demo password without editing the database by hand. One small script closes that.

## Current state

- `scripts/seed.ts` creates the demo users only when they are missing:

```ts
const existing = await db.query.user.findFirst({ where: eq(schema.user.email, demo.email) });
if (existing) {
  console.log(`user ${demo.email}: already exists`);
  continue;
}
```

- A password lives in the `account` table, in the row with `providerId: "credential"` and the user's id, column `password`, hashed with `hashPassword` from `better-auth/crypto`.
- `scripts/create-admin.ts` is the exemplar for a one-off account script. It loads `.env.local` then `.env` with dotenv, reads its inputs from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), validates them with zod, uses `drizzle(neon(url), { casing: "snake_case" })`, prints Spanish messages and never prints a secret:

```ts
config({ path: [".env.local", ".env"], quiet: true });
const email = z.email().max(100).safeParse(process.env.ADMIN_EMAIL?.trim().toLowerCase());
const password = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL;
if (!email.success || !password || password.length < 12 || password.length > 128 || !url) {
  console.error("Configura DATABASE_URL, ADMIN_EMAIL y una contraseña de 12 a 128 caracteres.");
  process.exit(1);
}
```

- `package.json` has `"db:create-admin": "tsx scripts/create-admin.ts"` and `"db:seed": "tsx scripts/seed.ts"`.
- Sessions are rows in the `session` table (`userId`). Every mutation in the app writes a row in `audit_log` (BR-AUD-01, see `src/lib/audit.ts` for the columns).
- `docs/llm/runbook.md` has a paragraph that says rotating the two existing accounts "still needs a separate step that the team has not built".
- The Neon HTTP driver cannot reach a plain local Postgres. `scripts/` use it directly, so a local test of the script needs the pure function split described in Step 1.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Unit tests | `pnpm test` | all pass |
| Checks | `pnpm typecheck && pnpm lint && pnpm build` | exit 0 |
| Missing input | `PASSWORD_EMAIL= NEW_PASSWORD= pnpm db:set-password` | Spanish error, exit 1, no database call |

## Scope

**In scope**: new `scripts/set-password.ts`, one `db:set-password` script in `package.json`, a unit test for the input validation (new `scripts/set-password.test.ts`, or a small pure helper under `src/lib/` with its test if Vitest does not pick up `scripts/`), `docs/llm/runbook.md`, `docs/llm/status.md`, `docs/llm/decisions.md` only if you need to record a decision.

**Out of scope**: a change-password screen, changing the seed logic, running the script against any real database (the operator does that), choosing or seeing the new password.

## Git workflow

Branch `feat/set-password-script` from the tip of `chore/improve-plans`. Commit `feat(auth): script that sets the password of an existing account (RF-01)`. Do not push unless told.

## Steps

### Step 1: The script

`scripts/set-password.ts`, same shape as `create-admin.ts`:

- Inputs from the environment only: `PASSWORD_EMAIL` and `NEW_PASSWORD` (never a command flag, flags end up in shell history). Validate the email with zod and the password as 16 to 128 characters. On bad input print one Spanish line and exit 1 before any database call.
- Find the user by email. If there is none, print "No existe una cuenta con ese correo." and exit 1.
- In one `db.batch`: update `account.password` (where `userId` matches and `providerId` is `credential`) with the new hash, delete that user's rows in `session` so old sign-ins stop working, and insert one `audit_log` row (action `update`, entity `users`, entity id the user id, detail `{ field: "password" }`, user name "Script de mantenimiento", no employee id). Check `src/lib/audit.ts` and `src/lib/db/schema.ts` for the exact column names and allowed action values before writing it. If no allowed action fits, STOP.
- If the update touched no `credential` row, print a Spanish error and exit 1.
- Print "Contraseña actualizada. Las sesiones abiertas de esa cuenta se cerraron." Never print the password or the hash.

Put the input validation in a small exported pure function so it can be tested without a database.

**Verify**: `pnpm typecheck` exit 0. The "Missing input" command prints the Spanish error and exits 1.

### Step 2: Test

Unit test for the validation function with RF-01 in the names: a 15 character password is rejected, a 16 character one is accepted, a bad email is rejected, a missing value is rejected.

**Verify**: `pnpm test` passes and the count went up.

### Step 3: Runbook

Replace the runbook paragraph that says rotation is not built with the real steps, in plain words: set `PASSWORD_EMAIL` and `NEW_PASSWORD` in the shell for one command, run `pnpm db:set-password` once per demo account, then update `SEED_PASSWORD` in `.env` (where it lives, never its value) so a future seed matches. Say that the command signs the account out everywhere. Update the open item in `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test && pnpm build` exit 0.

## Test plan

The unit test in Step 2. The database part is three statements in one batch and is checked by the operator on the first real run (sign in with the new password, the old one fails).

## Done criteria

- [ ] `pnpm db:set-password` exists and refuses bad input before touching the database
- [ ] The update, the session delete and the audit row are one batch
- [ ] Nothing prints or stores the password
- [ ] Runbook explains the rotation, status updated
- [ ] All checks exit 0
- [ ] `plans/README.md` row 010 updated, with the note that the operator still has to run it for both demo accounts

## STOP conditions

- `audit_log` has no action value that fits a password change.
- You would need a real password or the real `DATABASE_URL` to finish a step.
- Better Auth stores the credential somewhere other than `account.password`.

## Maintenance notes

If the team later builds a change-password screen, it should reuse the same three writes. The script works for any account, so the runbook must keep saying who may run it (whoever holds the production `DATABASE_URL`).
