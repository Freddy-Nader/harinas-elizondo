# Brief 013: How to plan Phase 2 of the shared API and CLI

This file is **not an executable plan**. It is the brief for a future planning session, so that session does not have to rediscover what this one learned. Nobody should execute it.

## How to use it

Open a new session in this repo and run:

```
/improve plan Phase 2 of the shared API and CLI. Read plans/013-api-cli-phase-2-brief.md and plans/008-shared-api-and-cli.md first, then write one plan per module.
```

The planning session writes plans `014` and up (one per module), adds them to `plans/README.md`, and marks this brief as superseded. Each of those plans is then run with `/improve execute`.

## What exists after Phase 1 (commit `59b6b24`)

- `src/lib/api/result.ts`: `Result<T>` is `{ ok: true, data, message }` or `{ ok: false, kind: "invalid" | "not_found" | "conflict", message, fieldErrors? }`.
- `src/lib/api/contract.ts`: `Contract` is `{ name, roles, input: zodSchema, fields: FieldMeta[] }`.
- `src/lib/api/registry.ts`: maps `"<module>/<operation>"` to `{ method, contract, execute }`. A new operation is one line here.
- `src/app/api/v1/[...op]/route.ts`: one catch-all handler. It answers 401 without a session, 404 for an unknown operation or wrong method, 403 by contract roles, 400 for bad JSON or bad input, then the use case result (200, 400, 404, 409).
- `src/lib/api/clients/`: contracts and use cases for `clients.create`, `clients.update`, `clients.list`. `src/app/(app)/clientes/actions.ts` `saveClient` is now a thin adapter.
- `cli/he.ts`: `pnpm he login | logout | clients create | clients update <id> | clients list`, flags built from the contract fields, session cookie in `~/.config/harinas-elizondo/session.json`.
- `docs/llm/api-cli.md` maps all 44 current operations of every module to their future API names. Start from that table.
- Tests to copy: `src/lib/api/clients/use-cases.test.ts` (unit, mocked db), `src/app/api/v1/clients.int.test.ts` (component, real Postgres), `src/proxy.test.ts`.

## What Phase 1 left open (decide these while planning)

1. **Clientes is not finished.** `changeClientStatus`, `saveClientLimit` and `removeClientLimit` still hold their logic in the server action. Finish Clientes first, as its own small plan.
2. **Success messages.** The API returns "Cliente registrado." and "Cliente actualizado.", which the screen never showed (it only redirects). Modules that use `ActionState` already have success messages, so reuse those byte for byte.
3. **Reads and roles.** `clients.list` is transaction only because the Clientes module is. Reportes and Bitácora are open to the query role too, so their contracts need both roles.
4. **The CLI is hardcoded to client fields.** `cli/he.ts` imports `clientFields` directly. Before the second module, make it build commands from a list of contracts (it cannot import `registry.ts`, which is `server-only`, so export a client-safe list of contracts).
5. **No Origin check on `/api/v1`.** Today it relies on the session cookie being SameSite=Lax. Decide once whether POST handlers should also check the Origin header, and record the decision.
6. **Ids in the site forms are not validated.** The API contract requires a UUID for `clients.update`, the site form does not. Align them when each module moves.
7. **Files.** Certificates `pdf` and Reportes `export` return a file, not JSON. Decide the response shape (binary with a content type) and how `he` saves it (`--out <file>`).

## Suggested order and size

One plan and one PR per module, in this order, because each one is a bit harder than the last: finish Clientes (S), Equipos (M), Lotes (M), Inspecciones (M), Certificados (L, has issue, send, cancel and the PDF), Reportes (M, has export), Bitácora (S, read only), Usuarios (S, admin role). Then Phase 3, `he check`, a scripted end-to-end pass against a `_test` database.

## Rules every one of those plans must carry

- No Spanish message and no business rule changes. Existing action tests pass unchanged or with import changes only.
- Each use case gets a unit test, each route operation gets a component test against a local `_test` Postgres.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` and `pnpm test:int` pass.
- Update `docs/llm/api-cli.md`, `docs/llm/status.md` and the test guides in the same change.
