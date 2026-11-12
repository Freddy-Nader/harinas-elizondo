# Status

Last updated 2026-11-11. Deadline **2026-11-13 23:59** (delivery 3). Update this file in every PR that moves something.

## Done

- [x] Architecture document (delivery 1, team, local PDF)
- [x] Partial technical design (delivery 2 draft in `docs/01_AVANCE_B1_B4.md`, SQL model in `docs/02_modelo_bd.sql`)
- [x] v0.1 prototype of Clientes (now in `legacy/`)
- [x] Next.js 16 scaffold with shadcn (base-ui), Sonner, Vitest
- [x] Drizzle schema draft for every entity, Better Auth wiring
- [x] App shell with Spanish navigation and a placeholder per module
- [x] Domain rules with tests for sequence, reference fallback, deviation and completeness
- [x] Agent docs (`AGENTS.md`, `docs/llm/`)
- [x] Project skill `dsw` in `.agents/skills/dsw/`, which resumes work from these docs and lists the course deliverables (2026-11-05)
- [x] Vercel deploy of the fork at https://harinas-elizondo.vercel.app, with Neon Postgres (Washington, D.C.) attached

## Next, in suggested order

Each step is one PR. Modules after step 3 can run in parallel.

1. [x] Connect Neon, run the first migration, seed parameters, international limits and one user per role (D-14). Done 2026-10-22, sign-in verified for both roles
2. [x] Session in the app shell (inside `<Suspense>`), `proxy.ts` redirect to `/login`, role guard helper for server actions, audit log helper (BR-AUD-01). Done 2026-11-04: `src/lib/session.ts` (`getCurrentUser`, `requireUser`, `requireRole`), `src/lib/permissions.ts`, `src/lib/audit.ts`, `src/proxy.ts`, nav and panel filtered by role, user menu with sign-out
3. [x] Clientes (UC-02), merged from PR #2 and preserved alongside session/roles and Equipos from PR #3. Directory, create/edit/deactivate/reactivate and client reference limits are implemented with server-side role checks and audit rows. Live Neon CRUD verification remains pending.
4. [x] Equipos (UC-01) with generated key, parameters, limits, history and the BR-EQP-03 block. Done 2026-11-04 in `feat/equipos-uc01` (stacked on `feat/session-roles-audit`): list with status filter, create, edit, inactivate/reactivate/retire with reason (D-16), international limits per parameter, change history from the audit log. Rules in `src/lib/domain/equipment.ts`. Checked end to end in a browser against a local database; still to check against Neon
5. [x] Lotes and Inspecciones (UC-03, UC-04) with automatic sequence, completeness and deviation preview. Done 2026-11-04 in `feat/lotes-inspecciones` (stacked on `feat/equipos-uc01`): lot list with search, create and edit (locked once certified), inspections started from the lot with the system sequence, re-inspection only after a complete one and with the equipment-failure reason (D-15), capture of both machines with live deviation preview against international limits, partial saves, only usable equipment (BR-EQP-03). Rules in `src/lib/domain/lot.ts`. Checked end to end in a browser against a local database; still to check against Neon
6. [x] Certificados (UC-05, UC-06, UC-07) with react-pdf, delivery evidence and inspection lock (D-13). Done 2026-11-11 in `certificados`: draft with D-17 id, live preview of the ten lines with deviation and reference source, BR-CER-05 checklist, issue (snapshot D-10, SHA-256 D-26, inspection lock BR-AUD-03), PDF route `/certificados/[id]/pdf`, simulated email with delivery evidence and resend (D-13), cancellation with reason (D-25), destination and carrier (D-24), latest-inspection rule (D-27). Migration 0003 applied. Rules in `src/lib/domain/certificate.ts`, services in `src/lib/services/`. Checked end to end in a browser against Neon on 2026-11-11 (test client `PRUEBA01`, lots `L-PRUEBA-001`/`L-PRUEBA-002`): blockers, draft edit, issue, PDF, send, resend, cancel, inspection lock. Email is still simulated (logged); switching to Resend needs an API key
7. [x] Reportes (UC-08) with filters, charts and Excel/CSV export (D-19). Done 2026-11-11 in PR #33 (`feat/reportes-uc08`, by laxmxn: real deviations, detail per parameter, Pareto and monthly charts) plus `feat/reportes-complement` on top: `requireRole("transaction", "query")` and `ModuleGate`, filters in the URL over `issuedAt` (presets, range, client, state), paginated history with a link to each certificate, KPIs for cancelled certificates and failed deliveries, export action with `.xlsx` (exceljs) and CSV plus an `export` audit row. Cancelled certificates (D-25) stay in the history and are counted apart; drafts are excluded. Rules in `src/lib/domain/report.ts`, export in `src/lib/services/report-export.ts`. Not yet checked in a browser against Neon or opened in Excel/Power BI
8. [ ] Bitácora screen
8a. [ ] Usuarios screen to add accounts and set roles (D-14)
8b. [ ] Mobile navigation (the sidebar is hidden below `md`)
9. [ ] Tests by type and their written guides ([testing.md](testing.md)). CI workflow done 2026-11-11 (issue #20): `.github/workflows/ci.yml` runs typecheck, lint, test and build on every PR and on every push to `main`, and it replaces `clients-checks.yml`. The branch rule that makes the check required on `main` is still pending with the repo owner. Component tests done 2026-11-11 (issue #21): `pnpm test:int`, 12 PC cases against Postgres 16, local Docker or the CI job
10. [ ] Technical specification (Spanish), based on the case study template (Technical Overview, Screen and Report Design, Data Design, SQL Design, Behavior Design, Interface Design, Quality of Service, Database Design, Installation, Open and Closed Issues)
11. [ ] Class presentation, team conclusions, individual lessons learned

## Inspection follow-up (2026-11-04)

- BR-INS-02/04: concurrent starts now fail on a sequence collision instead of retrying with an unauthorized next sequence. The sequence comes from the same latest inspection used for authorization.
- Added server-action regression coverage for concurrent starts, incomplete inspections, query-role denial, unauthenticated redirects and certified-inspection write denial. Unit suite: 82 tests.
- Manual verification guide: `docs/testing-inspections-es.md`. These tests mock database boundaries; live Neon and concurrent certification checks remain pending.

## Professor/PDF alignment (2026-11-04)

- Client forms now require fiscal address, RFC, contact name/email, and at least one delivery destination. Multiple destinations use a normalized child table; mutation and audit run together.
- Migration 0001 applied to the configured database, preserving previous delivery destinations. Legacy fiscal addresses remain null pending real input. After the user corrected duplicate RFCs, a database preflight found no duplicates and migration 0002 (unique RFC) was applied. The database now enforces uniqueness, including concurrent writes.
- Particular limits cannot widen international bounds. `assessQuality` keeps both international and applied-reference evaluations, ready for certificate integration; no PDF issuance is implemented by this follow-up.
- Validation: 93 unit tests, typecheck, lint and production compilation (webpack) passed. Browser reached login; authenticated form/CRUD verification remains pending.
- Detailed requirement audit: `docs/revision-requisitos-es.md`. Humidity and numerical standards remain unresolved. No private PDF or personal details copied into the public repo.

## Delivery address form refinement (2026-11-04)

- UC-02: each destination has its own labeled input. Users add another destination with a button below the fields and may remove extra fields, while retaining at least one. Server actions read repeated form entries and validate every address.
- Existing destinations populate individual fields. UI verification behind the user's authenticated session remains pending.

## Client duplicate alerts (2026-11-04)

- RF-03: separate user-facing messages for duplicate RFC and SAP keys, both during preflight and concurrent database unique-constraint failures. Existing edits exclude the current client from duplicate lookup. Unit tests verify rejection without writes and concurrent-conflict messages.

## Waiting on the team

See open questions in [decisions.md](decisions.md). Q-11 (parameter units), Q-12 (who builds what) and Q-13 to Q-15 (humidity, numerical references, certificate fields) are for the team.
