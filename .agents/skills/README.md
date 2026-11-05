# Shared agent skills

Project skills for any agent (Claude Code reads them through the `.claude` symlink).

## In this repo

- `dsw` is the project skill. It resumes work from `docs/llm/`, lists the course deliverables and keeps private material out of the public repo. Invoke it with `/dsw`.
- The UI skills from https://github.com/emilkowalski/skills are installed here and pinned in `skills-lock.json`. The ones `AGENTS.md` asks for are `emil-design-eng`, `apple-design` and `pick-ui-library`.

## Installing or updating the UI skills

```bash
npx skills add emilkowalski/skills -y
```

Run it from the repo root. It writes into `.agents/skills/` and updates `skills-lock.json`.
