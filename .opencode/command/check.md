---
description: Run the project quality gates (typecheck, lint, db:parse)
---

Run SkillGRID's fast quality gates and report the result of each:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run db:parse`

Do not run `npm run build` — the dev server may be running and the build would
clobber its `.next` directory. Report every failure with `file:line` and fix it
if $ARGUMENTS or the surrounding conversation asked for fixes.
