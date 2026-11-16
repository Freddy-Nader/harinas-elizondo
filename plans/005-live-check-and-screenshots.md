# Plan 005: Run the live checks on production and add the missing screenshots

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- docs/testing/pruebas-sistema-es.md docs/especificacion-tecnica-es.md`
> On a change, re-read both files before editing them.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (writes only test data to production, never real data)
- **Depends on**: none
- **Category**: tests, docs
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

The course grades evidence. Nine system cases (PS-08 to PS-16) are still "Pendiente", and the technical specification has about fifteen lines marked "TODO (equipo)" that ask for screenshots and a sample certificate PDF. The blocker (#19, rotated database credentials) is gone, because production and `vercel env pull` work again since 2026-11-15. One careful session in a browser closes most of it.

## Current state

- Production: https://harinas-elizondo.vercel.app, Neon Postgres, Resend email that `EMAIL_REDIRECT_TO` sends to a test inbox (the certificate page says so).
- Demo accounts from `scripts/seed.ts`: `laboratorio@demo.test` (transaction) and `consulta@demo.test` (query). The password is `SEED_PASSWORD` in the operator's local `.env`. An admin account exists, its credentials are only with the operator.
- `docs/testing/pruebas-sistema-es.md` has the PS-08 to PS-16 rows with columns Id, Requisito, Precondición, Pasos, Datos de entrada, Resultado esperado, Resultado obtenido, Estado. Rows PS-15 and PS-16 still say their PRs are not merged, which is no longer true (Bitácora #31 and mobile nav #35 are on `main`).
- `docs/especificacion-tecnica-es.md` lines that start with `> TODO (equipo): captura de ...` list each screenshot needed (login, panel per role, usuarios, clientes, equipos, lotes, inspección, certificado in three states, reportes, bitácora, mobile menu at 375 px), plus the sample PDF and an export opened in Excel and Power BI.
- Writing rules for these Spanish docs: no `:`, `;` or dashes in running prose, connect ideas with words. Tables are exempt. Never invent a result. If a step was not run, its Estado stays "Pendiente" with the reason.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Pull env (operator machine) | `vercel env pull .env.local --yes` then copy it over `.env.development.local` if that file exists | `pnpm dev` signs in |
| Pending migrations (PS-08) | `pnpm drizzle-kit migrate` against production `DATABASE_URL` | "No migrations to apply" or similar, exit 0 |
| Lint and tests after doc edits | `pnpm lint && pnpm test` | exit 0 |

## Suggested executor toolkit

A browser you can drive (Playwright, the Claude in-app browser, or Chrome). Screenshots as PNG, 1280 px wide for desktop, 375 px for mobile.

## Scope

**In scope**: `docs/testing/pruebas-sistema-es.md`, `docs/testing/README.md` (summary counts), `docs/especificacion-tecnica-es.md` (replace TODO lines with images and text), new folder `docs/img/` with PNGs and one sample PDF, `docs/llm/status.md`.

**Out of scope**: any code change. If a check fails, record Fail with what happened and open nothing else, then STOP and report.

## Git workflow

Branch `docs/live-evidence` from team `main`. Commit `docs(testing): record live checks PS-08 to PS-16 and add screenshots`. Do not push unless told.

## Steps

### Step 1: Sign in safely

Use the demo accounts only. Read the password from the operator's `.env` inside a script or ask the operator to sign in for you in the browser. Never print the password, never put it in a file, a commit or a screenshot.

**Verify**: `/panel` shows "Laboratorio Demo" (transaction) in the sidebar.

### Step 2: Prepare test data

Create everything with a `PRUEBA` prefix (client SAP key `PRUEBA02`, lots `L-PRUEBA-0xx`, equipment descriptions "Equipo de prueba"). Use fictional RFCs that match `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$`, for example `PRU260101AB1`, and `@example.test` emails.

**Verify**: the new client appears in `/clientes`.

### Step 3: Run PS-08 to PS-16 in order

Follow each row's Pasos exactly. For each one write in Resultado obtenido what you saw (with the date 2026-MM-DD and "en producción"), and set Estado to Pass or Fail. PS-15 is Bitácora with both roles, PS-16 is the mobile menu at 375 px. Update the row text of PS-15 and PS-16 so it no longer says the PRs are unmerged.

**Verify**: `grep -c "Pendiente (#19)" docs/testing/pruebas-sistema-es.md` → 0 for rows you ran. The Resumen table at the end matches the new counts.

### Step 4: Screenshots

Take one PNG per `TODO (equipo): captura` line, named `docs/img/<pantalla>.png` (for example `docs/img/reportes.png`, `docs/img/certificado-emitido.png`, `docs/img/menu-movil.png`). Only test data may be visible. Replace each TODO line with `![Descripción en español](img/<file>.png)` plus one sentence saying what it shows. Download the PDF of an issued test certificate to `docs/img/certificado-ejemplo.pdf` and link it where the spec asks for it. Include a screenshot of the new "Calidad de la producción" section of Reportes.

**Verify**: `grep -c "TODO (equipo): captura" docs/especificacion-tecnica-es.md` → 0. Every linked file exists (`ls docs/img`). No PNG is larger than 1 MB (`find docs/img -size +1M` → nothing).

### Step 5: Leave honest TODOs

Excel and Power BI screenshots need those desktop apps. If you do not have them, leave those TODO lines and say so in your report. The UAT lines stay TODO, they need real people.

### Step 6: Update counts

Update `docs/testing/README.md` (Pass and Pendiente per guide) and `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test` → exit 0.

## Test plan

This plan is itself a test run. Evidence is the updated table plus the screenshots.

## Done criteria

- [ ] PS-08 to PS-16 have a real Resultado obtenido and Pass or Fail
- [ ] No screenshot TODO left in the spec except Excel and Power BI if not available
- [ ] `docs/img/` holds the PNGs and the sample PDF, none over 1 MB, none with real or personal data
- [ ] Summary tables updated
- [ ] `plans/README.md` row 005 updated

## STOP conditions

- Sign-in fails with the demo accounts.
- Any step would show or store real client data.
- A check fails in a way that looks like a bug (record Fail, then stop and report the steps to reproduce).
- `pnpm drizzle-kit migrate` wants to apply a migration you did not expect.

## Maintenance notes

Test data stays in production with the `PRUEBA` prefix so later checks can reuse it. If the team wants a clean database before the final demo, deactivate those clients instead of deleting them (nothing is deleted by design).
