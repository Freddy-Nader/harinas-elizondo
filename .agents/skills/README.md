# Shared agent skills

Project skills for any agent (Claude Code reads them through the `.claude` symlink).

- `dsw` is the project skill. It resumes work from `docs/llm/`, lists the course deliverables and keeps private material out of the public repo. Invoke it with `/dsw`.

Recommended global skills for UI work, install once per machine.

```bash
npx skills add emilkowalski/skills
```

That brings `emil-design-eng`, `apple-design` and related skills. `pick-ui-library` comes from `emilkowalski/skill`.
