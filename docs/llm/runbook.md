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
4. Apply the migrations in `drizzle/` (after a schema change, run `pnpm db:generate` first and commit the new file).

```bash
pnpm db:migrate
```

5. Put `SEED_PASSWORD` in `.env` (not `.env.local`, which `vercel env pull` overwrites) and seed. The seed is idempotent. It creates the ten parameters, demo international limits (not official, see Q-11) and two demo users, `laboratorio@demo.test` (transaction) and `consulta@demo.test` (query), both with `SEED_PASSWORD`.

```bash
pnpm db:seed
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
- `upstream` is the team repo, https://github.com/ValleryR/harinas-elizondo, where Freddy has read access only. The first upstream PR is https://github.com/ValleryR/harinas-elizondo/pull/1 (from `feat/nextjs-scaffold`). While it is open, start new work on a branch stacked on `feat/nextjs-scaffold` so the open PR doesn't change under review. Open upstream PRs only when Freddy asks.
- Pull teammates' changes with `git fetch upstream` and merge `upstream/main` into a branch when needed.
- Never commit `docs/private/PA_IS.pdf`, `.env*` (except `.env.example`), or personal data. The repo is public.

## Deploy (Vercel)

- Freddy's fork deploys to https://harinas-elizondo.vercel.app (Vercel project `harinas-elizondo`, Hobby). `vercel.json` pins the Next.js preset, so a new Vercel project needs no manual framework setting.
- Each fork owner can link their fork to their own Vercel project. Pushes to a branch create a preview, pushes to `main` deploy production.
- Manual deploy from the CLI is `vercel` (preview) or `vercel --prod`.
- Env vars live in Vercel project settings. `vercel env pull` brings them down.
- Gotcha. `vercel link` and `vercel env pull` append `.env*` to `.gitignore`, which would hide `.env.example`. Revert that line (`git checkout .gitignore`) before committing.
- Preview deployments are behind Vercel Authentication, so plain `curl` gets a 401. Use `vercel curl <path> --deployment <url>` (it creates a protection bypass token) or open the preview in a browser signed in to Vercel. The production alias is public.
- Neon was added from the Vercel Marketplace (free plan, Washington, D.C., Neon Auth off because the app uses Better Auth). It provides `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to every environment.

## Legacy prototype

```bash
cd legacy/prototipo-v0.1 && node server.js
```

It serves http://localhost:3000 and writes `clientes.json` next to itself (gitignored).
