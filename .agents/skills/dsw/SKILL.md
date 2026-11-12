---
name: dsw
description: >
  Work on the "Harinas Elizondo" team project (the course calls it "Control de Laboratorio"), a Next.js app
  that issues wheat-flour quality certificates for the fictional mill Harinas Elizondo (FHESA). Final delivery
  2026-11-13 23:59. Use when someone says "/dsw", "/dsw next", "/dsw continue", "control de laboratorio",
  "harinas elizondo", mentions a module of the app (clientes, equipos, lotes, inspecciones, certificados,
  reportes, bitácora), or a course deliverable (especificación técnica, guías de pruebas, pruebas de
  aceptación, presentación, lecciones aprendidas). Resumes from the repo docs so every session starts from the
  same place.
---

# /dsw: Harinas Elizondo

Public, shareable version of the project skill. It holds no personal data. Read it fully, then the repo docs it points to.

## Files

- `AGENTS.md` has the hard rules. This skill never overrides it.
- `docs/llm/README.md` is the map of the agent docs.
- `docs/llm/status.md` says where the work stands and what comes next.
- `docs/llm/decisions.md` lists open questions and recorded decisions.
- `docs/llm/requirements.md` has the RF, UC and BR ids.
- `references/deliverables.md` (next to this file) lists what the course asks per delivery.

## Public repo only

This skill lives in a public repo, so keep out of every commit and file:

- Anything under `docs/private/` (gitignored) and any course material shared privately.
- Names or other personal data of team members, emails, chat links, grades.
- `.env*` files other than `.env.example`.
- Local machine paths. Always write repo-relative paths.

Before a commit, grep the staged diff for these.

## Modes

- **Resume** (default for `/dsw`, `/dsw next`, `/dsw continue`).
  1. Read `docs/llm/status.md` and `docs/llm/decisions.md`.
  2. Refresh facts with `git fetch --all`, `git status -sb`, new commits on `main`, the open and merged PRs of the team repo (a teammate may have a module in review), and the days left until 2026-11-13. Compare what merged against the steps in `status.md` and fix `status.md` if it lags.
  3. Report in one short block. What changed since the last update, where the work stands, and what is waiting on the user or the team.
  4. Ask what to do next. Offer the next unchecked step of `status.md` as the recommended option, adjusted for what step 2 found, plus up to three alternatives. Do not start building before the answer.
- **Build** a module or feature. Follow `AGENTS.md` and `docs/llm/`. Before starting, check that no open PR already covers the module. Branch from the latest `main` (`feat/<module>`), one PR per module, as the merged PRs did. Load `emil-design-eng` and `apple-design` for UI work and `pick-ui-library` before adding a UI dependency. Keep the RF/UC/BR ids in comments and test names. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Update `docs/llm/status.md` in the same change.
- **Deliverable** (technical specification, test guides, acceptance tests, presentation, conclusions). Follow `references/deliverables.md`. Graded documents are in Spanish. Draft in `docs/private/` until the team agrees, then move the public-safe parts into the repo.
- **Question** about the case or the course. Answer from `docs/llm/` first and say which file the answer came from.

## Key facts (verify before relying on them, they age)

- Deadline of delivery 3 is **2026-11-13 23:59**.
- Stack: Next.js 16 with Cache Components, pnpm, Tailwind v4 with shadcn (base-ui), Sonner, Drizzle with Neon Postgres, Better Auth, Vitest, Vercel.
- Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before using an API you are not sure about (session reads inside `<Suspense>`, `proxy.ts`, `use cache`).
- Git flow is in `AGENTS.md` and `docs/llm/runbook.md`. Never force-push shared branches.
- Snapshot of 2026-11-05 (it ages, `docs/llm/status.md` wins). Steps 2 to 5 are merged (session and roles, Clientes, Equipos, Lotes and Inspecciones), and Clientes was reworked after the professor review (fiscal address, delivery destinations, mandatory RFC and contact, particular limits cannot widen international ones). Reportes (UC-08) is in review as an open PR. Certificados, Bitácora, Usuarios, mobile navigation, the test guides and CI, and the written deliverables are still open. Open questions Q-11 to Q-15 are for the team and the professor.

## Patterns the merged modules follow

Details in `docs/llm/architecture.md`. Copy `src/app/(app)/equipos/` for a new module (`data.ts` reads, `actions.ts` writes, `_components/` client forms).

- Every server action starts with `requireRole()` and writes its audit row. Use `auditInsert` inside `getDb().batch([...])` when the change and the audit row must land together.
- Module pages wrap their body in `<Suspense>` with `ModuleGate`. Forms use `useFormAction`.
- Business rules go in `src/lib/domain/` as pure functions with tests named after the BR id. Actions are tested with mocked database boundaries.
- Duplicate-key database errors become field messages, never a 500 (`pgError` in `src/lib/action-state.ts`).
- Verified-by-hand guides for a module live in `docs/` (for example `docs/testing-inspections-es.md`). The requirement audit is `docs/revision-requisitos-es.md`.

## Conventions

- Code, identifiers, DB names, comments and commits are English.
- Everything the end user sees (UI, routes, errors, emails, PDFs) is Spanish.
- Agent docs are English. Human docs are English (`README.md`) plus Spanish (`README-es.md`).
- Domain rules live in `src/lib/domain/` as pure functions, with tests named after the BR id.
- Do not silently resolve an item in `docs/llm/decisions.md`. Ask, then record the answer there.
- Small, reversible PRs. Verify before saying done.

## Closing every session

1. Update `docs/llm/status.md` (and `decisions.md` when relevant).
2. If a new preference or lesson came up that helps the whole team, reword or merge it into this file. Never duplicate.
3. Keep `references/deliverables.md` in sync with what the course asks.
