# Status

Last updated 2026-10-22. Deadline **2026-11-13 23:59** (delivery 3). Update this file in every PR that moves something.

## Done

- [x] Architecture document (delivery 1, team, local PDF)
- [x] Partial technical design (delivery 2 draft in `docs/01_AVANCE_B1_B4.md`, SQL model in `docs/02_modelo_bd.sql`)
- [x] v0.1 prototype of Clientes (now in `legacy/`)
- [x] Next.js 16 scaffold with shadcn (base-ui), Sonner, Vitest
- [x] Drizzle schema draft for every entity, Better Auth wiring
- [x] App shell with Spanish navigation and a placeholder per module
- [x] Domain rules with tests for sequence, reference fallback, deviation and completeness
- [x] Agent docs (`AGENTS.md`, `docs/llm/`)
- [x] Vercel deploy of the fork at https://harinas-elizondo.vercel.app, with Neon Postgres (Washington, D.C.) attached

## Next, in suggested order

Each step is one PR. Modules after step 3 can run in parallel.

1. [x] Connect Neon, run the first migration, seed parameters, international limits and one user per role (D-14). Done 2026-10-22, sign-in verified for both roles
2. [ ] Session in the app shell (inside `<Suspense>`), `proxy.ts` redirect to `/login`, role guard helper for server actions, audit log helper (BR-AUD-01)
3. [ ] Clientes (UC-02), porting the prototype's validations plus client reference values
4. [ ] Equipos (UC-01) with generated key, parameters, limits, history and the BR-EQP-03 block
5. [ ] Lotes and Inspecciones (UC-03, UC-04) with automatic sequence, completeness and deviation preview
6. [ ] Certificados (UC-05, UC-06, UC-07) with react-pdf, Resend, delivery evidence and inspection lock (D-13)
7. [ ] Reportes (UC-08) with filters, charts, Excel export (Q-09)
8. [ ] Bitácora screen
8a. [ ] Usuarios screen to add accounts and set roles (D-14)
8b. [ ] Mobile navigation (the sidebar is hidden below `md`)
9. [ ] Tests by type and their written guides ([testing.md](testing.md)), CI workflow
10. [ ] Technical specification (Spanish), based on the case study template (Technical Overview, Screen and Report Design, Data Design, SQL Design, Behavior Design, Interface Design, Quality of Service, Database Design, Installation, Open and Closed Issues)
11. [ ] Class presentation, team conclusions, individual lessons learned

## Waiting on the team

See open questions in [decisions.md](decisions.md). Only Q-11 (parameter units) and Q-12 (who builds what) are left, and both are for the team.
