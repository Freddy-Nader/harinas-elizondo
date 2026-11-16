# Plan 008: One API behind the site and a CLI, so agents can test every backend action from a terminal

> **Executor instructions**: This is a design-and-first-slice plan. Do Phase 0
> and Phase 1 only, then STOP and report so the operator can review the shape
> before it spreads to every module. Run every verification command. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 89aa184..HEAD -- src/lib/session.ts src/lib/domain/client-validation.ts "src/app/(app)/clientes" src/lib/action-state.ts package.json`
> On a change, re-read those files and compare with "Current state". STOP on a mismatch you cannot reconcile.

## Status

- **Priority**: P2
- **Effort**: L (Phase 0 and 1 are M)
- **Risk**: MED (touches how every module is called)
- **Depends on**: plan 003 (one shared role guard)
- **Category**: direction, dx, tests
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

Today the only way to run a backend action (register a client, issue a certificate) is to click through the site or call a server action from a test with mocks. An agent cannot check from a terminal whether "register a client" really works against a real database. The goal is one API that both the site and a CLI call, so:

- what the screen asks for (fields, labels, validation messages) is exactly what the API and the CLI accept,
- an agent or a person can run every action from a terminal and see the same success or error the screen would show,
- a backend change is tested once and holds for both.

## Target design

```mermaid
flowchart LR
  subgraph Site["Site (Next.js pages)"]
    Form["Form component<br/>fields from the contract"]
    SA["Server action<br/>thin adapter"]
  end
  subgraph CLI["CLI (pnpm he ...)"]
    Cmd["Command<br/>flags from the contract"]
  end
  Route["Route handler<br/>/api/v1/[resource]/[op]<br/>thin adapter"]
  subgraph Core["src/lib/api (new)"]
    Contract["Contract per operation<br/>zod input + field metadata"]
    UseCase["Use case<br/>(actor, input) => Result"]
  end
  DB[("Postgres")]

  Form --> SA --> UseCase
  Cmd -- HTTPS + session cookie --> Route --> UseCase
  Contract -. used by .-> Form & Cmd & SA & Route
  UseCase --> DB
```

Three rules make "same on the site and the CLI" true by construction.

1. **One contract per operation** in `src/lib/api/<module>/contracts.ts`. A contract is `{ name, roles, input: zodSchema, fields: FieldMeta[] }`. `FieldMeta` holds `name`, Spanish `label`, `kind` (text, email, number, date, boolean, select, list), `required`, and `help`. The Spanish validation messages already live in the zod schema (for example `clientInputSchema` in `src/lib/domain/client-validation.ts`).
2. **One use case per operation** in `src/lib/api/<module>/use-cases.ts` with the signature `(actor: SessionUser, input: z.infer<typeof schema>) => Promise<Result<T>>`, where `Result` is `{ ok: true, data, message } | { ok: false, message, fieldErrors? }`. It holds today's action body (duplicate checks, `db.batch` with the audit row) and never touches `FormData`, `redirect`, `revalidatePath` or `headers()`.
3. **Adapters stay thin.** The server action reads the session (`authorizeMutation` from plan 003), turns `FormData` into the contract input, calls the use case, then does `revalidatePath` and `redirect` or returns `ActionState`. The route handler reads the session from the cookie, parses JSON with the same schema, checks `roles`, calls the use case and returns JSON with HTTP 200, 400 (validation), 401, 403 or 409 (duplicate). The CLI builds its flags and `--help` text from `fields` and sends JSON to the route.

Auth for the CLI is the normal Better Auth session. `he login` posts to `/api/auth/sign-in/email` (prompting for the password, or reading `HE_PASSWORD` from the environment, never from a flag) and stores the cookie in `~/.config/harinas-elizondo/session.json` with mode 600. RF-01 stays enforced on the server, the CLI never decides permissions.

## Current state

- `src/app/(app)/clientes/actions.ts` exports `saveClient(form: FormData)`, `changeClientStatus`, `saveClientLimit`, `removeClientLimit`. `saveClient` reads fields with `readClient(form)` into `clientInputSchema.safeParse({...})`, runs RFC and SAP duplicate preflights, then:

```ts
await db.batch([
  id ? db.update(clients).set(values).where(eq(clients.id, id))
    : db.insert(clients).values({ id: clientId, ...values, createdBy: user.id }),
  db.delete(clientDeliveryAddresses).where(eq(clientDeliveryAddresses.clientId, clientId)),
  db.insert(clientDeliveryAddresses).values(destinations),
  db.insert(auditLog).values({ /* user, action create|update, entity "clients" */ }),
]);
```

  On errors it calls `validationError(message)`, which redirects to `/clientes?error=...`. On success it redirects to `/clientes`.
- `src/lib/domain/client-validation.ts` holds `clientInputSchema` (sapKey, businessName, rfc, fiscalAddress, deliveryAddresses[], contactName, contactEmail, requiresCertificate) with Spanish messages.
- The Clientes form lives in `src/app/(app)/clientes/page.tsx` and `_components/delivery-addresses.tsx`, with labels written inline.
- Other modules (equipos, lotes, inspecciones, certificados, usuarios, reportes) follow the `ActionState` pattern from `src/lib/action-state.ts` (`fail`, `succeed`, `fieldErrorsFrom`, `pgError`). Equipos is the cleanest exemplar (`src/app/(app)/equipos/actions.ts`).
- Next.js 16.4 with Cache Components. Route handlers live in `app/**/route.ts`. Read `node_modules/next/dist/docs/` for route handlers before writing one. The existing route `src/app/(app)/certificados/[id]/pdf/route.ts` shows the session check pattern in a route.
- `src/proxy.ts` redirects requests without a session cookie to `/login`. Its matcher excludes `api/auth` only, so `/api/v1/*` without a cookie would get a redirect instead of 401. Phase 1 must exclude `api/v1` from the matcher and return 401 from the handler itself.
- Tests: Vitest unit tests next to code, component tests `*.int.test.ts` against local Postgres (`pnpm test:int`, see `docs/testing/README.md`), Playwright e2e in `e2e/`.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Checks | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | exit 0 |
| Component tests | `TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int` | all pass |
| Run CLI | `pnpm he --help` (you add the script) | lists commands |
| Local server | `pnpm dev` | http://localhost:3000 |

## Scope

**In scope (Phase 0 and 1)**: new `src/lib/api/` (shared types, `clients` contracts and use cases), new `src/app/api/v1/[...op]/route.ts` (or one route per operation, decide in Phase 0), `src/proxy.ts` matcher, `src/app/(app)/clientes/actions.ts` (becomes adapters), the Clientes form components (read labels from the contract), new `cli/` folder with the CLI entry, `package.json` (one `he` script, at most one devDependency for argument parsing, prefer Node's built-in `util.parseArgs`), tests, `docs/llm/architecture.md`, `docs/llm/decisions.md` (D-29), `docs/llm/status.md`.

**Out of scope**: every module except Clientes (later phases), public API keys or tokens, OpenAPI generation, changing any Spanish message or any business rule, changing the database.

## Git workflow

Branch `feat/api-cli-clientes` from team `main`. One commit per phase, for example `feat(api): shared contract and use cases for Clientes (RF-03, UC-02)` and `feat(cli): he clients commands over /api/v1 (RF-03)`. Do not push unless told.

## Steps

### Phase 0: Decide the shape (no code yet)

Write `docs/llm/api-cli.md` (English, agent doc) with the operation list for every module, mapped from the current server actions:

| Module | Operation | Today | Roles |
| --- | --- | --- | --- |
| clients | create, update, set-status, set-limit, remove-limit, list, get | `clientes/actions.ts`, `clientes/data.ts` | transaction (writes), transaction (reads) |
| equipment | create, update, set-status, set-international-limit, list, get, history | `equipos/actions.ts`, `equipos/data.ts` | transaction |
| lots | create, update, start-inspection, list, get | `lotes/*` | transaction |
| inspections | save-results, list, get | `inspecciones/*` | transaction |
| certificates | create, update, issue, send, cancel, list, get, pdf | `certificados/*` | transaction (pdf both) |
| reports | get, production-quality, export | `reportes/*` | transaction, query |
| audit | list | `bitacora/data.ts` | transaction, query |
| users | create, update | `usuarios/actions.ts` | admin |

Fill the table from the code (open each `actions.ts` and `data.ts`). Choose one route style and write why (recommended `POST /api/v1/<module>/<operation>` for writes and `GET /api/v1/<module>/<operation>` for reads, one catch-all handler that looks up the contract in a registry).

**Verify**: the doc lists every exported function of every `actions.ts` and `data.ts` (`grep -h "export async function" src/app/\(app\)/*/actions.ts src/app/\(app\)/*/data.ts | wc -l` equals the operation count you mapped, or you explain each difference).

### Phase 1, step 1: Contract and use case for clients.create and clients.update

Create `src/lib/api/result.ts` (`Result` type and helpers), `src/lib/api/clients/contracts.ts` (reuse `clientInputSchema`, add `fields` with the same Spanish labels the form shows today), `src/lib/api/clients/use-cases.ts` with `saveClient(actor, input & { id?: string })` holding today's logic and returning `Result` instead of redirecting. Keep the exact Spanish messages.

**Verify**: `pnpm typecheck` → exit 0. New unit test `src/lib/api/clients/use-cases.test.ts` (mock `@/lib/db` like `src/app/(app)/clientes/actions.test.ts` does) covers success, duplicate RFC, duplicate SAP key, unknown id. `pnpm exec vitest run src/lib/api` → pass.

### Phase 1, step 2: Server action becomes an adapter

`saveClient(form)` in `clientes/actions.ts` now does: guard, `FormData` to input, call the use case, then the same `redirect` calls as today based on `Result`. The form component reads labels from `fields`.

**Verify**: existing `src/app/(app)/clientes/actions.test.ts` and `actions.int.test.ts` pass unchanged (or with only import changes). `pnpm test` → all pass.

### Phase 1, step 3: Route handler

Add the handler for `clients.create`, `clients.update`, `clients.list`. Exclude `api/v1` from the `src/proxy.ts` matcher. Return 401 without a session, 403 for the wrong role (query user writing), 400 with `fieldErrors` for invalid input, 409 for duplicates, 200 with `{ ok, data, message }` otherwise.

**Verify**: component test `src/app/api/v1/clients.int.test.ts` against the local `_test` database calls the handler with a transaction session, a query session and no session, and checks each status code and that the audit row exists after a create.

### Phase 1, step 4: CLI

`cli/he.ts` run with `tsx` (`"he": "tsx cli/he.ts"` in `package.json`). Commands: `he login`, `he logout`, `he clients create`, `he clients update <id>`, `he clients list`. Flags come from `fields` (`--sap-key`, `--business-name`, `--rfc`, `--fiscal-address`, `--delivery-address` repeatable, `--contact-name`, `--contact-email`, `--no-requires-certificate`). `--json` prints the raw response. Base URL from `HE_URL` (default `http://localhost:3000`). Exit code 0 on `ok`, 1 on validation or permission errors, 2 on network errors. `--help` shows the Spanish labels and which flags are required.

**Verify**: with `pnpm dev` running against a local `_test` database (`E2E_LOCAL_POSTGRES=1`, see `e2e/support/global-setup.ts` for how the e2e suite seeds users), `pnpm he login` then `pnpm he clients create ...` prints the same success message the screen shows, a second identical call prints "La clave SAP ya pertenece a otro cliente. Usa una clave diferente." and exits 1, and `pnpm he clients list --json` contains the client.

### Phase 1, step 5: Docs and stop

Record D-29 in `docs/llm/decisions.md`. Update `docs/llm/architecture.md` (new layer `src/lib/api/`) and `docs/llm/status.md`. Then STOP and report with the diff summary and a sample CLI session.

**Verify**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → exit 0.

## Later phases (do not start without operator approval)

- Phase 2, one module per PR in this order. Equipos, Lotes, Inspecciones, Certificados (include `pdf` download to a file), Reportes (include production quality and export), Bitácora, Usuarios.
- Phase 3, `he check` runs a full scripted pass (create client, equipment, lot, complete inspection, issue, send, report) against a `_test` database and prints a pass or fail line per step. That is the "does the backend work" command for agents.

## Test plan

- Unit tests for each use case (mocked db), named with the RF/UC/BR ids like existing tests.
- Component tests for each route handler against local Postgres.
- Existing action tests keep passing, which proves the site behaves the same.

## Done criteria (Phase 0 and 1)

- [ ] `docs/llm/api-cli.md` maps every current operation
- [ ] Clientes create, update and list run through `src/lib/api/clients/` from both the site and the CLI
- [ ] Same Spanish messages on screen, in the API JSON and in the CLI
- [ ] New unit and component tests pass, old ones unchanged
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0
- [ ] D-29 recorded
- [ ] `plans/README.md` row 008 updated with "Phase 1 done, waiting for review"

## STOP conditions

- Plan 003 is not done (the guard you need does not exist).
- Keeping today's redirect behavior of the Clientes form would require changing a user-facing message.
- The CLI would need a long-lived secret other than the normal session cookie.
- Route handlers under Cache Components need a pattern you cannot find in `node_modules/next/dist/docs/`.
- Any step touches a module other than Clientes.

## Maintenance notes

- New operations start with the contract, then the use case, then adapters. A server action with business logic in it is a review blocker.
- The CLI talks HTTP on purpose, so it tests the real deployed stack (proxy, auth, route, use case, database). Do not let it import use cases directly.
- Pointing `HE_URL` at production writes real rows. Agents should use a local `_test` database unless the operator says otherwise.
