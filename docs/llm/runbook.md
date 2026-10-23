# Runbook

## Requirements

Node 22 or newer and pnpm 12 (`corepack enable` installs the version pinned in `package.json`).

## First run

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Without `DATABASE_URL` every screen renders, but login and any data screen fail with "DATABASE_URL is not set".

## Database (Neon)

1. In the Vercel project, open Storage, add **Neon** from the Marketplace and connect it to the project (all environments).
2. Pull the variables locally with `vercel env pull .env.local` (needs `vercel link` once).
3. Add `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) to Vercel and `.env.local`. Set `BETTER_AUTH_URL` to the site URL.
4. Create and apply migrations.

```bash
pnpm db:generate
pnpm db:migrate
```

`pnpm db:studio` opens Drizzle Studio to browse the data.

## Checks (run before every PR)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Git flow

- `origin` is Freddy's fork, https://github.com/Freddy-Nader/harinas-elizondo. **All current work happens here.** Branch from `main`, push the branch, open the PR against the fork's `main`, and Freddy reviews and merges it.
- `upstream` is the team repo, https://github.com/ValleryR/harinas-elizondo, where Freddy has read access only. Do not open PRs or push there. When Freddy is ready he opens one PR upstream himself and asks to be added as a collaborator.
- Pull teammates' changes with `git fetch upstream` and merge `upstream/main` into a branch when needed.
- Never commit `docs/PA_IS.pdf`, `.env*` (except `.env.example`), or personal data. The repo is public.

## Deploy (Vercel)

- Freddy's fork deploys to https://control-laboratorio-woad.vercel.app (Vercel project `control-laboratorio`, Hobby). `vercel.json` pins the Next.js preset, so a new Vercel project needs no manual framework setting.
- Each fork owner can link their fork to their own Vercel project. Pushes to a branch create a preview, pushes to `main` deploy production.
- Manual deploy from the CLI is `vercel` (preview) or `vercel --prod`.
- Env vars live in Vercel project settings. `vercel env pull` brings them down.

## Legacy prototype

```bash
cd legacy/prototipo-v0.1 && node server.js
```

It serves http://localhost:3000 and writes `clientes.json` next to itself (gitignored).
