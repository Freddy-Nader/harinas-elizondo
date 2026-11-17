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

`SEED_PASSWORD` must have 16 or more characters, and the seed refuses a shorter one. It lives in `.env` on each machine, so never write its value in a file or a chat.

Sign-in rate limits (D-28) are stored in the `rate_limit` table, created by migration `0005`. Run `pnpm db:migrate` against Neon before the new code reaches production, because sign-in fails while that table is missing.

To rotate the demo password, remember that the seed leaves existing users alone, so running `pnpm db:seed` again does not change the stored hash of `laboratorio@demo.test` or `consulta@demo.test`. Use `pnpm db:set-password` instead. Set `PASSWORD_EMAIL` and `NEW_PASSWORD` (16 to 128 characters) in the shell for that one command, with `DATABASE_URL` pointing at the target database, and run it once per demo account. The command signs the account out everywhere and writes an audit row. Then update `SEED_PASSWORD` in `.env` (never write its value in a doc) so a future seed matches. The script works on any account, so only whoever holds the production `DATABASE_URL` can run it.

## Checks (run before every PR)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Export docs to PDF

`pnpm docs:pdf` writes one PDF per course document plus `entrega-3-completa.pdf` to `docs/pdf/` (gitignored, uploaded to Teams by hand). It needs Playwright Chromium (`pnpm exec playwright install chromium`) and works offline because Mermaid is loaded from `node_modules`. Add new documents to the `DOCS` list in `scripts/docs-to-pdf.ts`.

## Project report (LaTeX)

The report lives in `latex/` (details in `latex/README.md`). It needs a TeX distribution with `latexmk` and `biber` (MacTeX on macOS).

```bash
./latex/build.sh                                   # redacted cover, writes latex/main.pdf
./latex/build.sh --name "Nombre Apellido" --id "00000000" --professor "Nombre"   # real cover, local only
```

The names go to `latex/private/portada.tex`, which Git ignores. Never put names, ids, the logo or the professor in a tracked file. The workflow `.github/workflows/report-release.yml` builds the redacted PDF and creates a release on the fork (`Freddy-Nader/harinas-elizondo`) on every push that touches `latex/`. The team repo skips it. If `biber` fails on macOS with a `lipo` error, the Xcode license is not accepted on that machine.

## Git flow

- The team repo is https://github.com/ValleryR/harinas-elizondo (`origin` in Freddy's clone). Contributors with push access create a branch there (`feat/`, `fix/`, `docs/`, `test/`, `ci/`), open a PR against `main`, and the PR merges with a merge commit once CI passes.
- Freddy's fork https://github.com/Freddy-Nader/harinas-elizondo (`fork` in that clone) only mirrors the team repo's `main` so Vercel can deploy it. Its `sync-upstream.yml` workflow runs on a schedule. Run it by hand after an upstream merge with `gh workflow run sync-upstream.yml -R Freddy-Nader/harinas-elizondo`.
- Never force-push a shared branch. If a PR is behind `main`, merge `main` into it.
- Never commit `docs/private/PA_IS.pdf`, `.env*` (except `.env.example`), or personal data. The repo is public.

## Deploy (Vercel)

- The fork's `main` deploys to https://harinas-elizondo.vercel.app (Vercel project `harinas-elizondo`, Hobby). `vercel.json` pins the Next.js preset, so a new Vercel project needs no manual framework setting.
- Each fork owner can link their fork to their own Vercel project. Pushes to a branch create a preview, pushes to `main` deploy production.
- Manual deploy from the CLI is `vercel` (preview) or `vercel --prod`.
- Env vars live in Vercel project settings. `vercel env pull` brings them down.
- Gotcha. In `pnpm dev`, `.env.development.local` wins over `.env.local`. If sign-in fails with "password authentication failed", an old `.env.development.local` still holds a rotated database password. Pull again into both files or delete the old one.
- Gotcha. `vercel link` and `vercel env pull` append `.env*` to `.gitignore`, which would hide `.env.example`. Revert that line (`git checkout .gitignore`) before committing.
- Preview deployments are behind Vercel Authentication, so plain `curl` gets a 401. Use `vercel curl <path> --deployment <url>` (it creates a protection bypass token) or open the preview in a browser signed in to Vercel. The production alias is public.
- Neon was added from the Vercel Marketplace (free plan, Washington, D.C., Neon Auth off because the app uses Better Auth). It provides `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to every environment.

## Email (Resend, D-13)

- `src/lib/services/mailer.ts` sends with Resend when `RESEND_API_KEY` is set. Without it every email is simulated and logged, so local dev and tests never send.
- Set `RESEND_API_KEY` (and optionally `EMAIL_FROM`, `WAREHOUSE_EMAIL`, `EMAIL_REDIRECT_TO`) in Vercel for Production, then redeploy. Env changes only apply to new deployments.
- Without a verified domain Resend sends only from `onboarding@resend.dev` and only to the Resend account owner's address. Other recipients fail with a validation error, which is stored as a failed delivery. For the demo set `EMAIL_REDIRECT_TO` to the owner's address, or verify a domain in Resend and set `EMAIL_FROM` on it.
