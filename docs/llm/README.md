# docs/llm · map for AI agents

Start here. These files tell an agent what the project is, what to build next and where everything lives. They are written in English for agents. Human-facing docs are `README.md` (English) and `README-es.md` (Spanish) at the repo root.

| File | Read it when |
| --- | --- |
| [context.md](context.md) | Always, first. Course, deliverables, deadline, team workflow, sources |
| [status.md](status.md) | Before picking work. What is done, what is next, who decides what |
| [requirements.md](requirements.md) | Before touching any module. RF, UC and BR ids used across the code |
| [domain.md](domain.md) | When you meet a Spanish domain word, a parameter or a table |
| [architecture.md](architecture.md) | Before writing code. Folders, layers, Next.js 16 rules, UI stack, language rules |
| [decisions.md](decisions.md) | Before changing anything that looks "wrong". Decisions taken and questions still open |
| [runbook.md](runbook.md) | To install, run, migrate, deploy or open a PR |
| [testing.md](testing.md) | When writing tests or the test guides the course requires |

## Rules of thumb

1. The team's architecture document (`docs/private/PA_IS.pdf`, gitignored, local only) is the source of truth for requirements. `requirements.md` is a faithful summary of it plus the professor's material. When they disagree, ask and log it in `decisions.md`.
2. Code is English, everything the end user sees is Spanish. Details in `architecture.md`.
3. Every module traces back to an RF/UC id. Keep those ids in code comments and test names so the technical spec can be generated from the code.
4. Never commit teammates' documents, personal data, or secrets. This repo is public.
5. Update `status.md` and `decisions.md` in the same change that moves the work forward.
