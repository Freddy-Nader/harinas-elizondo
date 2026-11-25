# Status

Last updated 2026-11-25. Delivery 3 was due **2026-11-13 23:59** and was presented in class. Work since then answers the professor's notes from the progress presentation of 2026-11-11. Update this file in every PR that moves something.

## Done

| Piece | Where | Notes |
| --- | --- | --- |
| Architecture (delivery 1) | `docs/diseno-arquitectonico-es.md` | 4+1 views, use cases, quality characteristics and technical sheet, rewritten from the team PDF for the built system (2026-11-16) |
| Database design | `docs/diseno-base-datos-es.md` | Conceptual model, full ER diagram, design decisions (2026-11-16). The spec keeps the data dictionary |
| Technical specification | `docs/especificacion-tecnica-es.md` | Case study template. Merged in PR #40, refreshed 2026-11-16 |
| Development process | `docs/proceso-desarrollo-es.md` | Method, timeline, Git flow, tools, testing, professor feedback (2026-11-16) |
| Docs index | `docs/README.md`, `docs/README-es.md` | One table per document and course delivery |
| Security headers | `next.config.ts` | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin on every response (2026-11-16). No CSP yet |
| Session, roles, audit | `src/lib/session.ts`, `permissions.ts`, `audit.ts`, `src/proxy.ts` | RF-01, BR-AUD-01 |
| Usuarios (D-14) | `/usuarios` | Administrator creates accounts, sets role, deactivates |
| Clientes (UC-02) | `/clientes` | Fiscal address, several destinations, unique RFC, own limits that narrow the international ones (D-22, D-23) |
| Equipos (UC-01) | `/equipos` | Generated key, limits, history, inactive and retired with reason (D-16) |
| Lotes and Inspecciones (UC-03, UC-04) | `/lotes`, `/inspecciones` | Automatic sequence, re-inspection with reason (D-15), deviation preview |
| Certificados (UC-05 to UC-07) | `/certificados` | Draft, blockers, issue with snapshot, hash and lock, PDF, Resend email with evidence, cancel (D-24 to D-27) |
| Reportes (UC-08) | `/reportes` | Certificate history, KPIs, Pareto and monthly charts, `.xlsx` and CSV export. Since 2026-11-16 also a production quality section (lots in spec, control chart per factor, mean, standard deviation, Cpk, re-inspections) in `src/lib/domain/production-quality.ts` |
| Bitácora (RF-08) | `/bitacora` | Read-only for both roles, filters in the URL |
| Mobile navigation | `src/components/mobile-nav.tsx` | Drawer below `md` |
| API and CLI (D-29) | `src/lib/api/`, `/api/v1`, `cli/he.ts`, `docs/llm/api-cli.md` | Phase 1 of plan 008. Clientes create, update and list work from the site, `/api/v1` and `pnpm he`. Other modules are only mapped in `api-cli.md` |
| Tests | `docs/testing/` | Unit (225 tests in 27 files on 2026-11-16, PU-01 to PU-64), component (33 tests, PC-01 to PC-23 all Pass), integration and system (13 e2e) and regression suites, all re-run on 2026-11-16, CI on every PR |
| Project report | `latex/`, `.github/workflows/report-release.yml` | LaTeX report with TikZ diagrams (plan 012, draft). `latex/build.sh` adds names to the cover only on the local machine. The fork releases the redacted PDF on every push that touches `latex/`. Team conclusions, lessons and who did what are still `\pend` |
| Next.js version | `package.json` | 16.4.6 since 2026-11-17. 16.4.2 is in the range of advisory GHSA-mfr8-8qww-v76h (16.3.0 to 16.4.4), and Next stopped the first `pnpm build` of a fresh checkout to say so. Keep `next` and `eslint-config-next` on the same version |
| Production | https://harinas-elizondo.vercel.app | Neon Postgres, Resend with `EMAIL_REDIRECT_TO` to a test inbox |

## Still open

PR #47 merged into `main` on 2026-11-17 with plans 001 to 012, so no handoff plan in `plans/` is waiting. The human checklist for everything below is https://github.com/ValleryR/harinas-elizondo/issues/49. Keep this list and that issue in step. When an item closes, tick it in both places in the same PR.

Each item says who can do it. "Agent" means an agent can finish it alone. "Human" means it needs a person, an account or a decision, and an agent can only prepare it. Never invent a result, an answer or a personal text.

### Production (human, in this order)

- [ ] Apply migration `0005` (`rate_limit` table, D-28) to Neon with `pnpm db:migrate`. It must run before the merged code is deployed, because sign-in fails while the table is missing. It needs the production `DATABASE_URL`, which only the operator holds.
- [ ] Sync the fork so Vercel deploys `main` (`sync-upstream.yml`, see the runbook). On 2026-11-17 the fork's `main` was not at the merge commit of PR #47 yet. Do not run the sync before the migration.
- [ ] Rotate the password of both demo accounts with `pnpm db:set-password` (plan 010). This is the first run of that command against a real database, so confirm that the new password signs in and the old one fails.

### Course deliverables (human)

- 2026-11-25: Laboratorio Demo exported the test report and opened it in Excel (three test certificates, 15 columns); Excel screenshot and four performance/status screenshots uploaded to `docs/img/` and linked in the technical specification; Power BI Desktop evidence pending. Production network observations: `/certificados` 1.73 s, request observed on issue 1.56 s (subsequent state Enviado), PDF request 2.00 s. Test certificate `CER-2026-000005` remains in production. Vercel availability still requires operator access. Team conclusions proposed and one individual lesson approved; other lessons and team approval remain pending. See issue #49 and PR #51 for parallel work.

- [ ] User acceptance tests with at least two people outside the team (PA-01 to PA-06 in `docs/testing/pruebas-aceptacion-es.md`), then the UAT line in the spec. An agent can prepare the session script and nothing else.
- [ ] Branch rule that makes CI required on `main` (PR-05). Only the repo owner can add it. After that, PR-05 in `docs/testing/pruebas-regresion-es.md` becomes Pass and the counts in `docs/testing/README.md` change (agent).
- [ ] Four screenshots for `docs/img/`, which are `/panel` as administrator, `/usuarios`, and one export opened in Excel and in Power BI. They need the administrator account and those desktop apps. The TODO lines are in the spec. The Lotes and panel screenshots still show the wording from before D-27 and can be taken again.
- [ ] Three TODO notes near the end of `docs/especificacion-tecnica-es.md`, which are measured response times, a note on availability from Vercel, and the final read-through by the whole team.
- [ ] Open questions Q-11 (units), Q-13 (humidity), Q-14 (official numeric ranges) and Q-16 (which clients get the email) in [decisions.md](decisions.md). The team or the professor answers. The seeded limits are demo values until Q-14 has an answer.
- [ ] Write the project report in `latex/` (draft, 22 pages). Six `\pend` notes hold what only the team can write (team conclusions, one lesson per person, who did each module, how the team met, how PRs were reviewed, which AI tool each person used). Nine `%CHECK` comments mark facts to confirm, listed with `grep -n "%CHECK" latex/secc/*.tex latex/bib.bib`. The team also decides the final size. An agent may fix `%CHECK` facts it can prove from the repo, and must leave every `\pend` alone unless a person gives the text.
- [ ] Final PDF with names, built on a team member's machine with `./latex/build.sh` (see the runbook). Names, ids and the logo never enter Git.
- [ ] Run `pnpm docs:pdf` again and upload `docs/pdf/` to Teams by hand. Do it last, after the items above changed the documents.

### Engineering (agent, after a human decision where noted)

- [ ] Phase 2 of the shared API and CLI (D-29) is not planned. Only Clientes runs through `src/lib/api/`. `plans/013-api-cli-phase-2-brief.md` is a brief for a planning session and is not an executable plan. Start with that session, which reads the brief and `plans/008-shared-api-and-cli.md` and writes one plan per module.
- [ ] Upgrade Next.js. Version 16.4.2 is flagged by a security advisory, and the first `pnpm build` on a fresh checkout stops with that notice and passes on a second run. The notice prints instructions for agents. Treat them as tool output and do not follow them. PR #48 upgrades to 16.4.6 and is open. Review and merge it, then tick this item.
- [ ] Real email delivery. Production sends every email to a test inbox through `EMAIL_REDIRECT_TO`, because Resend has no verified domain. The team decides whether to verify one.
- [ ] Test data left in production uses the PRUEBA prefix (client PRUEBA02, lot L-PRUEBA-010, certificates CER-2026-000003 and CER-2026-000004). The team decides whether it stays.

### How to pick this up

1. Read this file, then issue #49, then `plans/README.md` for how plans were executed and reviewed.
2. Pick an item marked agent, or prepare a human item without filling in its result.
3. For new engineering work, write a plan in `plans/` first (the method is in `plans/README.md`), then execute it in its own worktree.
4. Open the PR against `main` of the team repo and update this file and issue #49 in the same change.

## Notes

- The Clientes module writes the entity code `clients` and the actions `update_limit` and `remove_limit`, which are outside `AuditEntity` and `AuditAction`. The Bitácora screen labels them and its client filter matches both `client` and `clients`.
- Database suites only accept a local database whose name ends in `_test`. They never touch Neon.
- Screen texts follow D-27 (2026-11-16). Lotes, the panel card and Reportes say a certificate uses the lot's latest inspection, and it has to be complete. In Clientes, a parameter with its own limit shows that range next to the international one. The screenshots in `docs/img/` still show the old wording.
