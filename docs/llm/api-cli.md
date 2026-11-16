# API and CLI (plan 008, D-29)

One API sits behind the site and the CLI, so an agent can run every backend action from a terminal and see the same success or error the screen shows. Only Clientes is built so far (`clients.create`, `clients.update`, `clients.list`). The other modules are mapped below and come later, one module per PR.

## Layers

| Layer | Where | Rule |
| --- | --- | --- |
| Contract | `src/lib/api/<module>/contracts.ts` | `{ name, roles, input (zod), fields }`. `fields` holds the Spanish labels. No server-only imports, the CLI and the pages read it too |
| Use case | `src/lib/api/<module>/use-cases.ts` | `(actor, input) => Promise<Result<T>>`. Holds the duplicate checks, the `db.batch` and the audit row. Never touches FormData, redirect, revalidatePath or headers |
| Registry | `src/lib/api/registry.ts` | Maps `<module>/<operation>` to method, contract and use case |
| Server action | `src/app/(app)/<module>/actions.ts` | Thin adapter. Guard, FormData to input, use case, then redirect |
| Route handler | `src/app/api/v1/[...op]/route.ts` | Thin adapter. Session cookie, role, JSON to input, use case, JSON out |
| CLI | `cli/he.ts` | Builds flags and `--help` from `fields`, sends JSON over HTTP to the route. It never imports a use case, so it tests the real stack |

## Route style (chosen in phase 0)

`POST /api/v1/<module>/<operation>` for writes and `GET /api/v1/<module>/<operation>` for reads, served by one catch-all handler that looks the operation up in the registry.

Why one catch-all instead of one `route.ts` per operation. A new operation is one registry line plus its contract and use case, so no new route file and no new copy of the session, role and status mapping logic. The 401 for a missing session is also decided in one place, which matters because `src/proxy.ts` no longer guards `/api/v1`.

HTTP answers

| Status | When |
| --- | --- |
| 200 | `{ ok: true, data, message }` |
| 400 | Invalid JSON or invalid input, `{ ok: false, message, fieldErrors }`. `message` is the first Spanish validation message |
| 401 | No session. The proxy does not redirect `/api/v1`, the handler answers |
| 403 | The role is not in the contract `roles` (RF-01) |
| 404 | Unknown operation, or the record does not exist ("No se encontró el cliente.") |
| 409 | Duplicate RFC or SAP key |

## CLI auth

`he login` posts the email and password to `/api/auth/sign-in/email`. The password comes from the `HE_PASSWORD` environment variable or a hidden prompt, never from a flag. The CLI keeps only the session cookie (the `session_token` one) in `session.json` under `$XDG_CONFIG_HOME/harinas-elizondo/` (default `~/.config/harinas-elizondo/`), mode 600. The server decides every permission. The base URL comes from `HE_URL` (default http://localhost:3000). Pointing `HE_URL` at production writes real rows, so agents use a local `_test` database.

## Operation map

Every exported function of every `actions.ts` and `data.ts` under `src/app/(app)/`, 44 in total (39 `export async function` plus 5 plain `export function` in `clientes/data.ts`). Roles are what the code enforces today. "transaction" is the only role that mutates (`canMutate`).

| Module | Operation | Today | Roles |
| --- | --- | --- | --- |
| clients | `create`, `update` | `saveClient` in `clientes/actions.ts` (one function, `id` present means update). Built | transaction |
| clients | `set-status` | `changeClientStatus` | transaction |
| clients | `set-limit` | `saveClientLimit` | transaction |
| clients | `remove-limit` | `removeClientLimit` | transaction |
| clients | `list` | `listClients` in `clientes/data.ts`. Built | transaction |
| clients | `get` | `listClientLimits`, `listDeliveryAddresses`, `listInternationalLimits`, `listParameters` (page helpers, one `get` returns the client with its destinations and limits, reference data goes into a later `reference` read) | transaction |
| equipment | `create`, `update` | `createEquipment`, `updateEquipment` in `equipos/actions.ts` | transaction |
| equipment | `set-status` | `changeEquipmentStatus` | transaction |
| equipment | `set-international-limit` | `saveInternationalLimit` | transaction |
| equipment | `list`, `get`, `history`, `counts` | `listEquipment`, `getEquipment`, `getEquipmentHistory`, `countEquipmentByStatus` in `equipos/data.ts` | transaction |
| lots | `create`, `update`, `start-inspection` | `createLot`, `updateLot`, `startLotInspection` in `lotes/actions.ts` | transaction |
| lots | `list`, `get`, `product-suggestions` | `listLots`, `getLot`, `productSuggestions` in `lotes/data.ts` | transaction |
| inspections | `save-results` | `saveInspectionResults` in `inspecciones/actions.ts` | transaction |
| inspections | `list`, `get` | `listInspections`, `getInspection` in `inspecciones/data.ts` | transaction |
| certificates | `create`, `update`, `issue`, `send`, `cancel` | `createCertificate`, `updateCertificate`, `issueCertificate`, `sendCertificate`, `cancelCertificate` in `certificados/actions.ts` | transaction |
| certificates | `list`, `get`, `counts`, `form-options`, `deliveries` | `listCertificates`, `getCertificate`, `countCertificatesByStatus`, `certificateFormOptions`, `listDeliveries` in `certificados/data.ts` | transaction |
| certificates | `pdf` | Route `certificados/[id]/pdf/route.ts` (not an exported action or data function) | transaction, query |
| reports | `get`, `production-quality`, `client-options` | `getReportData`, `getProductionQualityData`, `getClientOptions` in `reportes/data.ts` | transaction, query |
| reports | `export` | `exportCertificatesAction` in `reportes/actions.ts`, and `getExportableCertificateData` in `reportes/data.ts` (no role check of its own) | transaction, query |
| audit | `list` | `listAuditLog` in `bitacora/data.ts` | transaction, query |
| users | `create`, `update` | `createUser`, `updateUser` in `usuarios/actions.ts` | admin |

Count check. clients 4 actions and 5 reads (9), equipment 4 and 4 (8), lots 3 and 3 (6), inspections 1 and 2 (3), certificates 5 and 5 (10), reports 1 and 4 (5), audit 0 and 1 (1), users 2 and 0 (2). The sum is 44, the same as `grep -h "export \(async \)\?function"` over the `actions.ts` and `data.ts` files. The `grep -h "export async function"` count the plan quotes is 39, and the difference of 5 is the plain synchronous reads of `clientes/data.ts`.

Differences to know about. The plan table lists "transaction (reads)" for clients, and that matches the site, because `modules.ts` gives the whole Clientes module to the transaction role only. `listClients` has no role check of its own today, the page gates with `ModuleGate`, so the API contract carries the role and a query user gets 403 on `clients.list`. Equipos, Lotes, Inspecciones and Certificados reads also require the transaction role in code. Reports, audit and the certificate PDF are open to both roles.

## Adding an operation

Contract first, then the use case, then the adapters. A server action that holds business logic is a review blocker.
