# Plan 011: Two screen texts that say the wrong thing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 59b6b24..HEAD -- "src/app/(app)/clientes/page.tsx" "src/app/(app)/lotes" src/lib/modules.ts "src/app/(app)/reportes/page.tsx"`
> On a change, compare with "Current state" and STOP on a mismatch.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (text only)
- **Depends on**: none
- **Category**: correctness, docs
- **Planned at**: commit `59b6b24`, 2026-11-16

## Why this matters

The live checks of plan 005 found two places where the screen tells the user something the app does not do. Both are small, but a grader who reads the screen next to the rules would see the contradiction.

## Current state

**Problem A, Clientes.** `src/app/(app)/clientes/page.tsx` around line 151, inside the limits list of a client:

```tsx
const own = limitsByCode.get(parameter.code);
const fallback = internationalByCode.get(parameter.code);
...
<p className="text-xs text-muted-foreground">
  {own ? "Límite particular" : "Límite internacional"} · {fallback ? fallback.lowerLimit + " a " + fallback.upperLimit : "Sin referencia internacional"}
</p>
```

When the client has its own limit the label says "Límite particular" but the range printed next to it is always the international one. The client's own values only show in the two inputs below.

**Problem B, Lotes and the panel card.** Decision D-27 in `docs/llm/decisions.md` says a certificate uses the lot's LATEST inspection, and if that one is incomplete the certificate is blocked. An older complete inspection is never picked. The code follows it (`src/lib/domain/certificate.ts:78` returns "La última inspección del lote (X) está incompleta. Complétala antes de certificar."). Three texts say something else:

- `src/app/(app)/lotes/page.tsx:21`: "Cada lote guarda sus inspecciones. La última inspección completa es la que se certifica."
- `src/app/(app)/lotes/[id]/page.tsx:46`: "... Para certificar se usa la última inspección completa."
- `src/lib/modules.ts:56` (the panel card): "... la última inspección completa se usa para certificar."

Texts that are already right, do not touch them: `src/app/(app)/certificados/page.tsx:30` ("Se emiten con la última inspección del lote, completa, ..."), `certificados/_components/certificate-form.tsx:90` and `:96`.

One text to check and decide, `src/app/(app)/reportes/page.tsx:424`: "Toma la última inspección completa de cada lote producido en el periodo". That is the production quality section, not certificates. Read `src/lib/domain/production-quality.ts` and `getProductionQualityData` in `reportes/data.ts`. If the code really takes the latest COMPLETE inspection of each lot, the text is right and stays. If it takes the latest inspection and skips the lot when it is incomplete, fix the text to say that.

Rules: everything the user sees is Spanish. No `:`, `;` or dashes in running prose.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Find texts | `grep -rn "ltima inspecci" src` | the list above |
| Checks | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | exit 0 |
| E2E (texts can be asserted there) | `grep -rn "ltima inspecci\|Límite particular\|Límite internacional" e2e src --include="*.test.*" --include="*.spec.*"` | tells you which tests assert these texts |

## Scope

**In scope**: `src/app/(app)/clientes/page.tsx` (that one `<p>`), `src/app/(app)/lotes/page.tsx`, `src/app/(app)/lotes/[id]/page.tsx`, `src/lib/modules.ts`, `src/app/(app)/reportes/page.tsx` (only if the check above says the text is wrong), any test or e2e spec that asserts one of the changed strings, `docs/llm/status.md`.

**Out of scope**: any logic, any other text, the screenshots in `docs/img/` (they show the old text and that is acceptable, say so in your report).

## Git workflow

Branch `fix/screen-texts` from the tip of `chore/improve-plans`. Commit `fix(ui): limit label in Clientes and the inspection wording follow the rules (D-27, BR-REF-01)`. Do not push unless told.

## Steps

### Step 1: Clientes label

Make the line show the range that the label names. With an own limit, print "Límite particular" and the client's own range, then the international reference after it, for example `Límite particular · 62 a 88 · Internacional 60 a 90`. Without an own limit keep today's text. `own` has `lowerLimit` and `upperLimit` like `fallback` (check the type from `listClientLimits` in `clientes/data.ts`).

**Verify**: `pnpm typecheck` exit 0.

### Step 2: Inspection wording

Change the three wrong texts so they say what D-27 says, in simple words. Suggested wording: "Para certificar se usa la última inspección del lote, y tiene que estar completa." Keep each sentence's other content.

**Verify**: `grep -rn "ltima inspección completa" src` shows only `reportes/page.tsx` (if it stayed) and nothing in `lotes` or `modules.ts`.

### Step 3: Tests and checks

Update any test that asserts an old string (see the grep in Commands). Do not weaken any assertion.

**Verify**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0. If the e2e suite asserts a changed string, run it with a local test database (`createdb harinas_plan011_test`, `TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan011_test E2E_PORT=3111 pnpm test:e2e`, then `dropdb`).

## Test plan

No new tests. Text only. Existing tests that assert these strings are updated to the new wording.

## Done criteria

- [ ] With an own limit, the Clientes line prints the own range next to "Límite particular"
- [ ] No text says an older complete inspection is used to certify
- [ ] All checks exit 0
- [ ] Only in-scope files changed
- [ ] `plans/README.md` row 011 updated

## STOP conditions

- The production quality code and its text disagree in a way that looks like a logic bug, not a wording problem.
- A changed string is part of an email or the PDF (those need the team's review).

## Maintenance notes

When a business rule changes, search the screens for the sentence that explains it. `src/lib/modules.ts` holds the panel card texts, which repeat rules in short form.
