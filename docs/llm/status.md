# Status

Last updated 2026-11-16. Delivery 3 was due **2026-11-13 23:59** and was presented in class. Work since then answers the professor's notes from the progress presentation of 2026-11-11. Update this file in every PR that moves something.

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
| Tests | `docs/testing/` | Unit (197 tests on 2026-11-16), component, integration, system and regression suites, CI on every PR |
| Production | https://harinas-elizondo.vercel.app | Neon Postgres, Resend with `EMAIL_REDIRECT_TO` to a test inbox |

## Still open

- [ ] User acceptance tests with at least two people outside the team (PA-01 to PA-06 in `docs/testing/pruebas-aceptacion-es.md`). Never invent results.
- [ ] Live verification on production with Neon (PS-08 to PS-14) and the system cases that wait on it.
- [ ] Screenshots and the sample certificate PDF that the spec marks with "TODO (equipo)".
- [ ] Branch rule that makes CI required on `main` (repo owner) and a CI run from a fork (PR-05 to PR-07).
- [ ] Team conclusions and individual lessons learned (outside the repo, they hold personal opinions).
- [ ] Open questions Q-11 (units), Q-13 (humidity) and Q-14 (official numeric ranges) in [decisions.md](decisions.md). The seeded limits are demo values.

Handoff plans for agents that pick up the open items live in `plans/`.

## Notes

- The Clientes module writes the entity code `clients` and the actions `update_limit` and `remove_limit`, which are outside `AuditEntity` and `AuditAction`. The Bitácora screen labels them and its client filter matches both `client` and `clients`.
- Database suites only accept a local database whose name ends in `_test`. They never touch Neon.
