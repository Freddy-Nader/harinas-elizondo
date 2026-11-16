# Shared agent skills

Project skills for any agent (Claude Code reads them through the `.claude` symlink, Codex and other agents read `.agents/skills/`).

- `dsw` is the project skill. It resumes work from `docs/llm/`, lists the course deliverables and keeps private material out of the public repo. Invoke it with `/dsw`.
- `improve` audits the codebase as a senior advisor and writes self-contained plans in `plans/` for other agents to execute. It never edits code itself. The current plans and their order are in `plans/README.md`.

## Using improve

| Goal | Prompt |
| --- | --- |
| Run the next plan with a reviewer | `/improve execute plans/005-live-check-and-screenshots.md` |
| Run a plan with any agent, no skill needed | `Read plans/README.md, then follow plans/005-live-check-and-screenshots.md exactly` |
| Refresh the plans after merges | `/improve reconcile` |
| Plan one new piece of work | `/improve plan <what you want>` |
| New audit | `/improve` (or `/improve quick`, `/improve security`) |

When a plan is done, update its row in `plans/README.md` in the same PR.

## Recommended global skills for UI work

Install once per machine.

```bash
npx skills add emilkowalski/skills
```

That brings `emil-design-eng`, `apple-design` and related skills. `pick-ui-library` comes from `emilkowalski/skill`.
