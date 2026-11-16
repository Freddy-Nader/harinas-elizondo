# Plan 001: Send basic security headers on every response

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- next.config.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

Production (https://harinas-elizondo.vercel.app) only sends Vercel's `Strict-Transport-Security`. Any site can frame the app, and browsers may sniff content types. Session cookies are SameSite=Lax, so a framed page is logged out and the real risk is low, but three standard headers close it for free and the security audit of 2026-11-16 listed it as finding 2.

## Current state

- `next.config.ts` — Next.js 16.4 config, no `headers()` today:

```ts
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};
```

- The certificate PDF opens inline from `/certificados/[id]/pdf` in a new tab, never inside an iframe of this app, so `X-Frame-Options: DENY` does not break it. Confirm with `grep -rn "<iframe" src` (expected no match).
- This is Next.js 16, which differs from older versions. Read `node_modules/next/dist/docs/` for `headers` before writing code (`grep -rl "async headers" node_modules/next/dist/docs | head`).

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |
| Run | `pnpm build && pnpm start` then `curl -sI http://localhost:3000/login` | headers listed below |

## Scope

**In scope**: `next.config.ts`, `docs/llm/status.md` (one line), `docs/especificacion-tecnica-es.md` (one bullet under Calidad de servicio, Atributos de calidad, Seguridad row).

**Out of scope**: a full Content-Security-Policy. It needs nonces for Next.js inline scripts and recharts styles, and a wrong CSP breaks the app. Do not add one.

## Git workflow

- Branch `fix/security-headers` from `main` of https://github.com/ValleryR/harinas-elizondo.
- Conventional commit, for example `fix(security): send anti-framing and nosniff headers (RF-01)`.
- Do NOT push or open a PR unless the operator told you to.

## Steps

### Step 1: Add `headers()` to the config

Add to `nextConfig`:

```ts
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ];
},
```

**Verify**: `pnpm typecheck && pnpm build` → both exit 0.

### Step 2: Check the live headers locally

Run `pnpm start` in the background (needs `.env.local`, see `docs/llm/runbook.md`; without a database `/login` still renders), then `curl -sI http://localhost:3000/login`.

**Verify**: output contains `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`.

### Step 3: Docs

Add one line to the Done table in `docs/llm/status.md` and mention the headers in the Seguridad row of the Atributos de calidad table in `docs/especificacion-tecnica-es.md` (Spanish, no colons or semicolons in prose).

**Verify**: `pnpm lint && pnpm test` → exit 0.

## Test plan

No unit test (config only). Step 2 is the check. Optionally add an assertion in `e2e/login.spec.ts` that the response of `/login` has `x-frame-options` equal to `DENY`, following the existing `test(...)` style in that file.

## Done criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0
- [ ] `curl -sI http://localhost:3000/login` shows the three headers
- [ ] `git status` shows only the in-scope files changed
- [ ] `plans/README.md` row 001 updated

## STOP conditions

- `next.config.ts` already has a `headers()` function.
- The build warns that `headers` is unsupported with `cacheComponents` or Partial Prefetching.
- Any page of the app embeds itself in an iframe.

## Maintenance notes

If someone later embeds the PDF in an iframe of the app, switch `DENY` to `SAMEORIGIN`. A CSP is a separate, larger task.
