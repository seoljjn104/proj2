---
description: Run the end-to-end smoke test against the running app
---

Run the SkillGRID end-to-end smoke test:

1. Confirm a dev server is up on `http://localhost:3000` (start `npm run dev` if
   not) and that Supabase is reachable (`supabase status`, or the hosted URL in
   `.env.local`).
2. `npm run e2e` — it reads `E2E_PASSWORD` from the environment or `.env.local`
   and refuses to run when unset.
3. Report the pass/fail count and any failing check with its HTTP response.

Default target is the hosted project; override with `APP_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`. Never print or commit credentials.
