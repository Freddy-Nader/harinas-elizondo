# Decisions and open questions

Add a row when something is decided. Move a question to the decisions table once the team answers it. Never silently change code that implements an open question.

## Decisions

| Id | Date | Decision | Why |
| --- | --- | --- | --- |
| D-01 | 2026-10-22 | Build with Next.js 16 (App Router, TypeScript, Tailwind v4), deploy on Vercel | Team choice. One codebase for UI and server, free hosting with previews per PR |
| D-02 | 2026-10-22 | Postgres on Neon + Drizzle ORM | The SQL draft already targets Postgres. Drizzle keeps the schema typed and readable for the technical spec |
| D-03 | 2026-10-22 | Better Auth (email and password) with `role` and `employeeId` on the user | RF-01 needs roles and the employee id on every action |
| D-04 | 2026-10-22 | shadcn on base-ui, Sonner, recharts (curated picks) | Accessible, consistent, small |
| D-05 | 2026-10-22 | The v0.1 prototype moves to `legacy/prototipo-v0.1/` untouched | Keep it as reference. Its validations (SAP key, RFC regex) get ported. Probably deleted later |
| D-06 | 2026-10-22 | English table and column names (`clients.sap_key`) instead of the Spanish names in `docs/02_modelo_bd.sql` | Code is English by project rule. The glossary in `domain.md` maps both |
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
| D-11 | 2026-10-22 | Work happens in Freddy's fork with PRs against the fork's own `main`. One PR upstream later, when Freddy is ready, together with a request to be added as collaborator | Freddy has read-only access upstream, and the scaffold should mature before the team reviews it. Vercel previews run from the fork |

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

Migration `0003_certificate_shipping_cancel` adds those columns and the enum value. Additive only, applied to the shared Neon database on 2026-11-10.

## Open questions

| Id | Question | Proposed answer | Owner |
| --- | --- | --- | --- |
| Q-11 | Units for each parameter (current ones are guesses from the equipment annexes) | Team decides, possibly with the professor | Team |
| Q-12 | Who builds which module before 2026-11-13? | Split by module, one PR each | Team |

| Q-13 | Humidity mentioned in professor review is not one of the ten factors in RF-02; which method/equipment captures it and is it an additional factor? | Await direct clarification; do not substitute water absorption for moisture | Team |
| Q-14 | Which authoritative specification supplies numerical reference ranges and confirmed units for the ten rheological factors? | Current seed values are demo-only | Team |
