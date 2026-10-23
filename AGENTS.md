# AGENTS.md

Harinas Elizondo is a university team project (the course calls it "Control de Laboratorio") that builds a web app to issue wheat-flour quality certificates (lots, inspections, reference values, PDF certificates, email delivery, reports, audit log). Final delivery is due **2026-11-13 23:59**.

## Read first

1. `docs/llm/README.md` is the map. Then `docs/llm/context.md` and `docs/llm/status.md`.
2. Before a module, read its RF/UC/BR ids in `docs/llm/requirements.md`.
3. Before code, read `docs/llm/architecture.md` (Next.js 16 with Cache Components has new rules).

## Hard rules

- **Language.** Code, identifiers, DB names, comments and commits are English. Everything the end user sees (UI text, routes, errors, emails, PDFs) is Spanish. Agent docs are English. Human docs are English (`README.md`) plus Spanish (`README-es.md`).
- **Public repo.** Never commit `docs/private/PA_IS.pdf`, anything under `docs/private/`, `.env*` other than `.env.example`, student names or other personal data.
- **Traceability.** Reference RF/UC/BR ids in comments and test names.
- **Decisions.** Do not silently resolve an item listed in `docs/llm/decisions.md`. Ask, then record the answer there.
- **Keep docs current.** Update `docs/llm/status.md` (and `decisions.md` when relevant) in the same change.
- **Checks before a PR.** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must pass.
- **UI work.** Load the `emil-design-eng` and `apple-design` skills, and `pick-ui-library` before adding a UI dependency.
- **Git.** Work happens in Freddy's fork. While the first upstream PR (`feat/nextjs-scaffold`) is open, new branches stack on it and their PRs stay inside the fork. Open upstream PRs only when Freddy asks (see `docs/llm/runbook.md`). Never force-push shared branches.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm typecheck` | `next typegen` then `tsc` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm build` | Production build |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle migrations and browser |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
