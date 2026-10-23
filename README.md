# Control de Laboratorio · Harinas Elizondo

*[Leer en español](README.es.md)*

A web app that issues quality certificates for wheat flour. The lab registers production lots and their inspections (alveograph and farinograph results), the app compares them with each client's reference values, and it produces a PDF certificate that is emailed to the client and the warehouse. It also keeps the history, reports and an audit log.

University team project for *Desarrollo de Software* (Universidad Anáhuac, fall 2026). Final delivery is on 2026-11-13.

## Stack

Next.js 16, TypeScript, Tailwind v4 with shadcn (base-ui), Postgres on Neon with Drizzle, Better Auth, Vitest, deployed on Vercel.

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Database setup, migrations and deploys are in [docs/llm/runbook.md](docs/llm/runbook.md).

## Project docs

| | |
| --- | --- |
| [docs/llm/](docs/llm/README.md) | Requirements, domain, architecture, decisions, status and testing (written for AI agents, useful for humans too) |
| [docs/01_AVANCE_B1_B4.md](docs/01_AVANCE_B1_B4.md) | Technical design draft (Spanish) |
| [docs/02_modelo_bd.sql](docs/02_modelo_bd.sql) | Original relational model (Spanish names) |
| [legacy/prototipo-v0.1/](legacy/prototipo-v0.1/README.md) | First prototype of the Clientes module, kept as reference |

## Contributing

Fork the repo, work on a branch, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, and open a pull request to `ValleryR/harinas-elizondo`. Code is written in English and everything users see is in Spanish.

This is an academic prototype and not meant for production use.
