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
| D-14 | 2026-10-22 | Accounts come from a seed script (one demo user per role) plus a Usuarios screen where a transaction user adds accounts and picks the role. Public sign-up is off | Keeps the Security characteristic strong and still lets the demo create users |
| D-11 | 2026-10-22 | Work happens in Freddy's fork with PRs against the fork's own `main`. One PR upstream later, when Freddy is ready, together with a request to be added as collaborator | Freddy has read-only access upstream, and the scaffold should mature before the team reviews it. Vercel previews run from the fork |

## Open questions

| Id | Question | Proposed answer | Owner |
| --- | --- | --- | --- |
| Q-03 | Who authorizes a re-inspection after an equipment failure, and how is it recorded? | Transaction user types a reason, it goes to the audit log | Team |
| Q-04 | Equipment "baja" vs "inactivación". Can a retired machine come back? | Inactive can return, retired cannot | Team |
| Q-05 | Certificate id format | `CER-YYYY-NNNNNN` | Team |
| Q-08 | What does "digital signature" mean for us? | A flag plus the signer's name and timestamp printed on the PDF, no cryptographic signature | Team |
| Q-09 | Excel export format | `.xlsx` via `exceljs`, plus CSV | Team |
| Q-11 | Units for each parameter (current ones are guesses from the equipment annexes) | Confirm with the annexes | Team |
| Q-12 | Who builds which module before 2026-11-13? | Split by module, one PR each | Team |
| Q-13 | Should query users see the audit log, or only managers? | Both roles can read it | Team |
| Q-14 | Is a lot tied to a product catalog or free text? | Free text in v1 | Team |
