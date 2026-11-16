# Context

## What this is

A team project for the course *Desarrollo de Software* (Ingeniería en Tecnologías de Información, Universidad Anáhuac, fall 2026). The professor's work sheet calls it "Proyecto Aplicativo / Integrador, Control de Laboratorio". The team designs, builds, tests and documents a system that issues **quality certificates for wheat flour** for a fictional mill called *Fábrica de Harinas Elizondo, S.A.* (FHESA, also "Harinas Elizondo").

The project is worth 30% of the final grade.

## The business problem in one paragraph

When a production lot is finished, the lab analyzes a sample with two machines, an alveograph and a farinograph, and records the results as an inspection. Later, when a client places an order that needs a certificate, the lab picks the lot, takes its latest complete inspection, compares the values against the client's reference limits (or the international ones), and issues a PDF certificate that shows any deviation. The PDF is emailed to the client contact and to the warehouse, which prints it and attaches it to the invoice. Today this is done with spreadsheets and a PDF editor, and staff sometimes "adjust" old inspections to fit a client, which is exactly the risk the new system removes.

## Deliverables and dates

The work sheet (version 1.4) defines three partial deliveries, each presented in class.

| # | Due | Content | Where it lives |
| --- | --- | --- | --- |
| 1 | 2026-03-01 | Architecture. Logical, process, development and physical views, UML use cases, quality characteristics and their technical sheet ("ficha técnica") | Original team PDF `docs/private/PA_IS.pdf` (local only), rewritten for the built system in `docs/diseno-arquitectonico-es.md` |
| 2 | 2026-09-17 | Technical design. Detailed use cases, database, interfaces, technical design document | `docs/especificacion-tecnica-es.md` and `docs/diseno-base-datos-es.md` |
| 3 | **2026-11-13 23:59** | Construction. Working program, test guides (scripts), unit tests, other tests (component, integration, system, regression), user acceptance tests, technical specification | This repo, `docs/testing/`, `docs/especificacion-tecnica-es.md`, `docs/proceso-desarrollo-es.md` |

After the last delivery each team writes conclusions and each member writes lessons learned.

Every test type needs its written guide ("guía" or script), not just code. See [testing.md](testing.md).

## Team and workflow

- Four to five students. Names are not stored in this public repo.
- The team repo is ValleryR/harinas-elizondo. Contributors push branches there and open PRs against its `main`. See [runbook.md](runbook.md).
- Deliveries are uploaded by the team to Microsoft Teams (course channel, "Compartido > Proy. Aplicativo/Integrador").

## Sources

| Source | Public? | Notes |
| --- | --- | --- |
| `docs/private/PA_IS.pdf` | No, gitignored | Team architecture document (delivery 1). Source of truth for requirements |
| `docs/README.md` | Yes | Index of the course documents (architecture, database, spec, process, test guides) |
| Git history before 2026-11-16 | Yes | The delivery 2 draft (`docs/01_AVANCE_B1_B4.md`, `docs/02_modelo_bd.sql`) and the v0.1 prototype (`legacy/`), removed once superseded |
| Professor material on Teams | No | Work sheet, functional requirements v0.1, case study template ("CasoEstudioCtrLab"), process document "Proceso Certificados de laboratorio", business and process models, equipment annexes (Chopin alveograph, Brabender farinograph) |
| Books | No | Sommerville, *Ingeniería de Software* 9th ed. and Pressman, *Ingeniería del software, un enfoque práctico* 7th ed. |

Agents on a team member's machine may have extra local context (for example a personal skill). Nothing from it belongs in this repo unless it is public-safe.
