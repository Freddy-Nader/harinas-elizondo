# Decisions and open questions

Add a row when something is decided. Move a question to the decisions table once the team answers it. Never silently change code that implements an open question.

## Decisions

| Id | Date | Decision | Why |
| --- | --- | --- | --- |
| D-01 | 2026-10-22 | Build with Next.js 16 (App Router, TypeScript, Tailwind v4), deploy on Vercel | Team choice. One codebase for UI and server, free hosting with previews per PR |
| D-02 | 2026-10-22 | Postgres on Neon + Drizzle ORM | The SQL draft already targets Postgres. Drizzle keeps the schema typed and readable for the technical spec |
| D-03 | 2026-10-22 | Better Auth (email and password) with `role` and `employeeId` on the user | RF-01 needs roles and the employee id on every action |
| D-04 | 2026-10-22 | shadcn on base-ui, Sonner, recharts (curated picks) | Accessible, consistent, small |
| D-05 | 2026-10-22 | The v0.1 prototype moves to `legacy/prototipo-v0.1/` untouched | Keep it as reference. Its validations (SAP key, RFC regex) get ported. Deleted on 2026-11-16 once every validation lived in `client-validation.ts` |
| D-06 | 2026-10-22 | English table and column names (`clients.sap_key`) instead of the Spanish names in the delivery 2 SQL draft (removed 2026-11-16, see git history) | Code is English by project rule. The glossary in `domain.md` maps both |
| D-07 | 2026-10-22 | Two tables, `international_limits` (one row per parameter) and `client_limits` (one row per client and parameter). The name stays "international" in code and UI | Matches the team doc's wording (a separate table for international values and another for client values). A reserved client (999 or 0) would be a fake row every list, report and count has to exclude, and could collide with a real SAP key. "International" is the term the course documents and lab staff use |
| D-08 | 2026-10-22 | Inspection sequence after Z continues AA, AB … ZZ, AAA (bijective base 26, max 3 letters) | Team doc says "continue with an additional sequence". `varchar(3)` matches the SQL draft |
| D-09 | 2026-10-22 | One inspection holds the results of both machines | Logical view puts alveograph and farinograph results in the same inspection, and the certificate needs both |
| D-10 | 2026-10-22 | Certificate lines are a snapshot of value, limits and deviation | History must not change when reference values change later (RF-07, RF-08) |
| D-12 | 2026-10-22 | Client limits are per client, not per client and product | Team doc. Per-product limits are a version 2 idea |
| D-13 | 2026-10-22 | Email with Resend, certificate PDF with `@react-pdf/renderer` on the server. In development emails are logged, not sent | Free tier works from Vercel with one API key, PDF built from React components |
| D-14 | 2026-10-22 | Accounts come from a seed script (one demo user per role) plus a Usuarios screen where a separate administrator adds, disables and assigns operational accounts (confirmed 2026-11-11). Public sign-up is off | Keeps the Security characteristic strong and still lets the demo create users |
| D-15 | 2026-10-22 | A re-inspection after a complete one is allowed for any transaction user who types the equipment-failure reason. It is stored in `inspections.reinspection_reason` and in the audit log | Meets "with authorization" without a third role or an approval queue |
| D-16 | 2026-10-22 | Equipment `inactive` is temporary and can be reactivated. `retired` (baja) is final and kept only for history. Both need a reason | Gives the two states different meanings, as the requirements list both |
| D-17 | 2026-10-22 | Certificate id `CER-YYYY-NNNNNN`, a 6-digit counter that restarts every year (for example `CER-2026-000123`) | Readable on paper and over the phone, sorts by date, fits `varchar(16)` |
| D-18 | 2026-10-22 | "Digital signature" is a per-certificate checkbox. When on, the PDF prints a signed-by block with the issuer's name, employee id and timestamp. No cryptography | Matches "as the user decides" and fits the deadline |
| D-19 | 2026-10-22 | History export as `.xlsx` (exceljs) plus CSV | Power BI reads both, and xlsx keeps accents, dates and column types right |
| D-20 | 2026-10-22 | Both roles can read the audit log | Managers audit, and it supports the Traceability characteristic |
| D-21 | 2026-10-22 | A lot's product is free text, with suggestions from earlier lots | No catalog needed while limits are per client (D-12) |
| D-11 | 2026-10-22 | Work happens in Freddy's fork with PRs against the fork's own `main`. One PR upstream later, when Freddy is ready, together with a request to be added as collaborator. Superseded once Freddy got push access upstream (November 2026). Branches now go straight to the team repo, see runbook.md | Freddy has read-only access upstream, and the scaffold should mature before the team reviews it. Vercel previews run from the fork |
| D-29 | 2026-11-16 | One API behind the site and a CLI. Each operation has a contract (zod input, roles, Spanish field labels) and a use case in `src/lib/api/`. Server actions and the route handler `POST/GET /api/v1/<module>/<operation>` (one catch-all) are thin adapters, and `pnpm he` calls the route over HTTP with the normal session cookie. `/api/v1` is outside the proxy matcher and answers 401 itself. Clientes is the first module. Map and details in `api-cli.md` | An agent can run every backend action from a terminal against a real database and see the same Spanish messages as the screen, and a backend change is tested once for both. The CLI needs no key other than the session cookie |

| D-30 | 2026-11-25 | Resolve Q-11 for the course delivery: retain the ten implemented parameter units | Team approval reported by a team member; actual equipment protocol remains to be verified before operational use |
| D-31 | 2026-11-25 | Resolve Q-13 for the course delivery: moisture is distinct from water absorption and is not an additional RF-02 factor in this version | Team approval reported; no change to measurement workflow; actual laboratory moisture method not confirmed |
| D-32 | 2026-11-25 | Resolve Q-14 for the course delivery: retain seeded limits as demonstration values only, not official acceptance limits | Team approval reported; official product/client specifications are still required before operational reliance |
| D-33 | 2026-11-25 | Resolve Q-16 for the course delivery: retain contact email when present plus warehouse; production still redirects to test inbox | Team approval reported; no external delivery or company policy confirmation inferred |

## Professor review (2026-11-04)

The user's direct review notes supplement the local architecture document. D-22: clients require one fiscal address and one or more delivery destinations. Destinations are normalized in `client_delivery_addresses`; the old delivery column is temporarily mirrored for compatibility. Existing fiscal addresses remain unknown until entered, never copied from delivery addresses. D-23: particular limits may narrow but not widen the international range. International limits stay shared per parameter, not duplicated per physical equipment.

The local PDF data dictionary also marks client RFC (unique), contact name and contact email mandatory. Forms now enforce those fields. The user corrected existing duplicate RFCs. Preflight confirmed no duplicates, then migration 0002 applied the unique constraint; no records were automatically merged or deleted.

## Certificates (2026-11-10, resolves Q-15)

| Id | Date | Decision | Why |
| --- | --- | --- | --- |
| D-24 | 2026-11-10 | A certificate stores a copy of the chosen client destination (`certificates.delivery_address`) and the carrier (`carrier`). Both are required before issuing, with invoice, delivered quantity and shipping date (BR-CER-05) | D-22 gives a client several destinations; a copy keeps issued certificates unchanged when addresses are edited later (same idea as D-10). The PDF dictionary asks for the carrier |
| D-25 | 2026-11-10 | Issued or sent certificates are cancelled with a reason (`cancelled_at`, `cancelled_by`, `cancellation_reason`, status `cancelled`), never deleted. The snapshot, hash and inspection lock stay. A draft is not cancelled, it is just never issued | The PDF dictionary asks for a cancellation status. Keeps history and traceability |
| D-26 | 2026-11-10 | The "signature hash" is a SHA-256 of the issued content (`signature_hash`), computed at issue time, printed on the PDF and re-checked on screen against the stored data. It complements D-18 (printed signature block), it does not replace it | Gives the dictionary's hash and tamper evidence without key management |
| D-27 | 2026-11-10 | BR-CER-01 uses the lot's LATEST inspection. If it is incomplete the certificate is blocked; an older complete inspection is never picked silently | Professor review (`docs/revision-requisitos-es.md`) |
| D-28 | 2026-11-16 | Sign-in rate limits are stored in Postgres (`rate_limit` table, Better Auth `storage: "database"`). Sign-in allows 5 tries per minute per IP, other auth routes 100. The seed password must have 16 or more characters | Better Auth keeps counters in memory by default, and every Vercel serverless instance has its own memory, so a guessing script spread over instances was barely slowed. The two demo accounts share one seed password (RF-01) |

Migration `0003_certificate_shipping_cancel` adds those columns and the enum value. Additive only, applied to the shared Neon database on 2026-11-10.

## Open questions

| Id | Question | Proposed answer | Owner |
| --- | --- | --- | --- |
| Q-12 | Who builds which module before 2026-11-13? | Split by module, one PR each. What actually happened, by GitHub user, is in `docs/proceso-desarrollo-es.md` | Team |



## Revisión técnica provisional (25 de noviembre de 2026)

Relacionado con Q-11, Q-13, Q-14 y Q-16 (issues #9 y #49). Investigación documental y propuestas aprobadas por el equipo para la entrega, según confirmación de una integrante el 25 de noviembre de 2026. No constituye aprobación de Harinas Elizondo ni del profesor.

| Parámetro | Unidad actual | Rango de demostración | Referencia metodológica |
| --- | --- | --- | --- |
| Tenacidad (P) | mm H₂O | 60–90 | ISO 27971:2023 |
| Extensibilidad (L) | mm | 80–120 | ISO 27971:2023 |
| Fuerza panadera (W) | 10⁻⁴ J | 250–350 | ISO 27971:2023 |
| Relación P/L | Adimensional | 0.5–1 | ISO 27971:2023 |
| Índice de elasticidad (I.E.) | % | 45–60 | ISO 27971:2023 |
| Absorción de agua | % | 58–64 | ISO 5530-1 |
| Tiempo de desarrollo | min | 2–6 | ISO 5530-1 |
| Estabilidad | min | 8–15 | ISO 5530-1 |
| Grado de ablandamiento | UF (FU) | 30–80 | ISO 5530-1 |
| Tiempo de llegada | min | 1–2.5 | Lectura temporal del farinograma; confirmar protocolo del equipo |

- **Q-11:** conservar las unidades implementadas para esta entrega; antes de uso operativo, verificar el modelo y protocolo de los equipos y la convención de reporte de P y absorción con el laboratorio.
- **Q-13:** la humedad mide el agua presente en la harina, no la absorción durante el amasado. ISO 712-1:2024 y NOM-247-SSA1-2008 describen métodos de determinación de humedad; el método gravimétrico por secado requiere estufa y balanza. El equipo decidió no agregar un undécimo factor en esta versión; el método empleado por la empresa sigue sin confirmarse.
- **Q-14:** los intervalos anteriores son los observados en la demostración, no límites oficiales ni universales. Las normas citadas describen métodos de ensayo; se necesita ficha técnica aprobada por producto/cliente para establecer límites de aceptación. La etiqueta actual «internacional» del sistema no acredita el origen normativo de estos valores.
- **Q-16:** deliveryRecipients en src/lib/domain/certificate.ts incluye el correo de contacto si existe y el del almacén, sin duplicados. Producción redirige a un buzón de prueba mediante EMAIL_REDIRECT_TO. El equipo aprobó conservar esta regla para la entrega; no se acredita una política comercial oficial de la empresa. No se comprobó entrega externa.

Fuentes consultadas:
- ISO 27971:2023: https://www.iso.org/standard/82591.html
- ISO 5530-1 (texto de consulta): https://www.iso.org/obp/ui?_escaped_fragment_=iso%3Astd%3Aiso%3A5530%3A-1%3Aed-5%3Av1%3Aen
- ISO 712-1:2024: https://www.iso.org/standard/85395.html
- NOM-247-SSA1-2008, método de humedad en harina: https://sidof.segob.gob.mx/notas/docFuente/5100356

No se dispone de la ficha técnica oficial de Harinas Elizondo ni se pudo recuperar docs/revision-requisitos-es.md de main. Las cuatro preguntas se cierran como decisiones de alcance de la entrega (D-30 a D-33), según aprobación comunicada por una integrante. La validación operativa de protocolos, límites oficiales y política comercial sigue pendiente; no se alteran parámetros, seed, certificados ni código de producción.
