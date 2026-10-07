# SkillGRID

Direct 1:1 peer-to-peer skill exchange. Two people, reciprocal skills, one
session at a time — no tokens, no credits, no group calls.

**Stack:** Next.js 15 (App Router) · Tailwind CSS v4 · Supabase (Postgres,
Auth, Realtime, Edge Functions) · Zoom (Server-to-Server OAuth) for 1:1
meeting links.

---

## 1. Prerequisites (external accounts)

| Service | What you need |
|---|---|
| [Supabase](https://supabase.com) | A project (free tier is fine). Project URL + anon key from **Project Settings → API**. |
| [Zoom](https://zoom.us) | A **Server-to-Server OAuth** app: [zoom.us/profile → Apps → Create App → Server-to-Server OAuth](https://marketplace.zoom.us/). You get **Account ID**, **Client ID**, **Client Secret**. The app needs the `meeting:write:admin` (or `meeting:write:user`) scope. |
| Node.js | v20+ (v24 verified). |
| Supabase CLI | `npm i -g supabase` (v2 verified), or use `npx supabase`. |
| Docker | Only needed for fully local Supabase (`supabase start`). Skip it if you push to a hosted project. |

---

## 2. Database setup (external step — run once)

### Option A — hosted Supabase project (recommended)

```bash
supabase login                       # browser authorization, once
supabase link --project-ref YOUR_PROJECT_REF   # project ref = URL subdomain
supabase db push                     # applies all 4 migrations
supabase db query -f supabase/seed.sql --linked   # inserts the skill catalog
```

`db push` applies, in order:

1. `supabase/migrations/20261006000001_schema.sql` — tables, FKs, indexes
2. `supabase/migrations/20261006000002_rls_policies.sql` — RLS on every table
3. `supabase/migrations/20261006000003_functions.sql` — triggers, match RPCs, views, grants
4. `supabase/migrations/20261006000004_realtime.sql` — realtime publication

> CLI v2 has no `db seed` subcommand — seeding goes through
> `db query -f supabase/seed.sql --linked` (shown above), or run the file
> from the SQL Editor.

### Option B — local stack

```bash
supabase start        # requires Docker
supabase db reset     # applies migrations + seed
```

Local signup is frictionless: the local GoTrue runs with
`MAILER_AUTOCONFIRM=true`, so new accounts are confirmed immediately
(mail still lands in Mailpit at http://127.0.0.1:54324 for inspection).

Point `.env.local` at the local stack:

```ini
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
```

(The current `.env.local` points at the hosted project; the local values are
kept commented at the bottom of the file for swapping.)


### Promote yourself to admin (required for the Moderation page)

1. Sign up in the app with your account.
2. SQL Editor:

```sql
UPDATE public.profiles SET is_admin = true
WHERE email = 'you@yourinstitution.edu';
```

### Restrict signups to institutional domains (optional)

Development default: **any** email domain is allowed. To restrict, either

- set `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=university.edu,college.edu` (client-side
  friendly check), **and/or**
- insert domains into the authoritative table (DB-enforced by the
  `enforce_email_domain()` trigger):

```sql
INSERT INTO public.allowed_email_domains (domain) VALUES ('university.edu');
```

Empty table = every domain allowed.

---

## 3. Edge function secrets (external step)

The function is already deployed to the hosted project; the remaining
external step is the Zoom credentials:

```bash
supabase functions deploy generate-meeting-link
supabase secrets set \
  ZOOM_ACCOUNT_ID=your_account_id \
  ZOOM_CLIENT_ID=your_client_id \
  ZOOM_CLIENT_SECRET=your_client_secret
```

The function is invoked by the client right after a provider accepts a
session (`status -> ACCEPTED`). It creates a scheduled Zoom meeting and
stores `join_url` in `sessions.meeting_link`. It is idempotent: if a link
already exists it is returned unchanged. Without the secrets it fails with
a clear configuration error (the app shows a retryable "Generate 1:1
meeting link" button).

> If your CLI rejects the minimal `supabase/config.toml`, run
> `supabase init` once and merge the `[functions.generate-meeting-link]
> verify_jwt = true` block into the generated file.

---

## 4. Run the app

```bash
npm install
npm run dev                         # http://localhost:3000
```

`.env.local` (already filled in for the hosted **SkillGRID** project):

```ini
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=          # empty = allow all domains
```

Verify **Email** is enabled under **Authentication → Providers → Email**
(default: on, "Confirm email" required — SkillGRID expects the
verification flow). Hosted signups receive a confirmation email; until the
new user clicks the link, confirm them from the SQL Editor if you don't
want to configure **Authentication → URL Configuration → Redirect URLs**.

### Test accounts (dev only)

`alice@skillgrid.test` (admin), `bob@skillgrid.test`, `carol@skillgrid.test`
— seeded with a reciprocal OFFERED/WANTED pair (Next.js ↔ Guitar) so the
marketplace, Direct Match badges and Matching Hub all have data.

The shared test password is read from `E2E_PASSWORD` (environment) or
`.env.local` (gitignored) — it is deliberately never committed.

---

## 5. Quality checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # next build
npm run db:parse    # libpg_query syntax check of all SQL files
npm run e2e         # end-to-end smoke test (needs supabase start + npm run dev)
npm run simulate    # full user-flow simulation (SIM_EMAIL + SIM_PASSWORD)
npx supabase db advisors --linked   # Supabase security/performance advisors
```

`npm run e2e` drives the whole product over HTTP: middleware redirects,
authenticated SSR pages, discovery RPCs, RLS negatives, the session
lifecycle triggers (overlap, transitions, meeting-link gating), the Zoom
edge function's configuration-failure path, chat, reviews and moderation.
Target it at hosted by overriding `APP_URL`, `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (the test password is read from `E2E_PASSWORD` /
`.env.local`).

**Advisors baseline:** `db advisors --linked` should report **0 errors**.
The expected leftovers are informational: warnings for the intentional
`SECURITY DEFINER` RPCs (each re-checks the caller internally — see §6),
the optional leaked-password toggle (Authentication → Password Settings),
and unused-index notes for indexes kept on purpose.

---

## 6. Architecture notes

### Matching engine

`public.get_reciprocal_matches(p_user_id)` (SECURITY DEFINER) implements:

```
A matches B  ⟺  A.OFFERED = B.WANTED  ∧  A.WANTED = B.OFFERED
```

Tag names compare case-insensitively (`lower()` both sides; a unique index
on `lower(skill_tags.name)` keeps the catalog clean). Flagged profiles are
excluded. `public.get_marketplace_feed(p_search, p_limit)` returns every
profile with its two tag arrays plus an `is_direct_match` flag computed
against the caller.

### RLS model (strict own-row, discovery via RPCs)

| Table | Who can read | Who can write |
|---|---|---|
| `profiles` | own row (direct); others only through `get_profile_directory()` / feed RPCs | own row; moderation fields admin-only (trigger) |
| `skill_tags` | any signed-in user | nobody via API (`add_skill_tag()` RPC only) |
| `user_skills` | own row | own row |
| `sessions` | the two participants | participants; status transitions enforced by trigger |
| `messages` | session participants | participants, as themselves |
| `reviews` | participants of the session | reviewer; `COMPLETED` + participant checks via trigger |
| `allowed_email_domains` | nobody (deny-all) | SQL only |

Trigger-enforced business rules (`20261006000003_functions.sql`):

- `check_session_overlap` — half-open range overlap prevention per participant (back-to-back allowed), `23514` on conflict
- `enforce_session_transition` — PENDING→ACCEPTED **provider only**; cancel by either; ACCEPTED→COMPLETED by either; terminal states locked; `meeting_link` only writable while ACCEPTED
- `validate_review` — session must be COMPLETED, reviewee must be the other participant
- `protect_moderation_fields` — only admins can change `is_admin` / `flagged` / `flag_reason`
- `enforce_email_domain` — allowlist gate on `auth.users` insert
- `handle_new_user` — creates `public.profiles` on signup

`20261007000001_advisor_fixes.sql` hardens the surface for Supabase
Advisors: the `profile_directory` / `admin_user_flags` views became
`get_profile_directory()` / `get_admin_flags()` SECURITY DEFINER RPCs
(pinned `search_path`, granted to `authenticated`/`service_role` only),
direct `EXECUTE` on the trigger functions was revoked from API roles
(triggers are unaffected — PostgreSQL checks the privilege at trigger
creation, not at fire time), `allowed_email_domains` got an explicit
deny-all policy, and the unused `idx_skill_tags_category` index was
dropped. Remaining Advisors warnings for the RPCs are intentional: every
one re-checks `auth.uid()`/admin status internally.

### Session lifecycle

```
PENDING ──(provider accepts, Zoom link generated)──▶ ACCEPTED
   │                                                  │
   ├─(either cancels)──▶ CANCELLED◀──(either)────────┤
   └─────────────────────────────────────(either)────▶ COMPLETED ──▶ reviews unlock
```

### Realtime

`messages` and `sessions` are added to the `supabase_realtime`
publication. The chat view subscribes to `INSERT` on `messages`
(filtered by `session_id`) and `UPDATE` on `sessions` (status /
meeting link); RLS decides what each subscriber actually receives.

### Routes

| Route | Purpose |
|---|---|
| `/` | Landing (auto-redirects to marketplace when signed in) |
| `/login`, `/signup`, `/auth/callback` | Email auth + verification exchange |
| `/marketplace` | Marketplace feed with Direct Match badges |
| `/matches` | Reciprocal Matching Hub |
| `/sessions`, `/sessions/[id]` | Session list, lifecycle actions, realtime chat, reviews |
| `/profile` | Profile details + OFFERED/WANTED skill manager |
| `/admin` | Flag/unflag moderation board (admins only) |

---

## 7. Project layout

```
supabase/
  migrations/            # 4 SQL migrations (schema, RLS, functions, realtime)
  seed.sql               # skill catalog + admin/allowlist snippets
  functions/generate-meeting-link/   # Zoom S2S OAuth edge function
  config.toml
scripts/parse-sql.mjs    # SQL syntax validator (libpg_query)
scripts/e2e.mjs          # end-to-end smoke test (app + API + triggers + RLS)
scripts/simulate.mjs     # single-account product-flow simulation
src/
  app/                   # routes: (auth)/, (app)/, auth/callback
  components/            # marketplace, matches, chat, sessions, profile, admin, layout
  hooks/useAuth.tsx      # session + profile provider, domain-checked signup
  lib/supabase/          # browser/server/middleware clients
  lib/email-domains.ts   # institutional domain allowlist helper
  types/database.ts      # hand-written DB types
```

---

## 8. Deploying to Vercel

The app is fully environment-driven (no hardcoded hosts), so it deploys as-is.

### Option A — GitHub integration (recommended)

```bash
git init && git add -A
git commit -m "SkillGRID: peer-to-peer skill exchange"
git remote add origin https://github.com/YOU/skillgrid.git
git push -u origin main
```

1. Open https://vercel.com/new → **Import** the repo (framework auto-detected: Next.js).
2. Under **Environment Variables** add the three production vars:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://kepjsrnrbnoxmxgobsff.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` = empty (allow all) or a comma-separated list
3. **Deploy** → the app is live at `https://<project>.vercel.app`.
4. Pushes to `main` now redeploy automatically.

### Option B — Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
vercel login
vercel            # first (preview) deploy, answers prompts
vercel --prod     # production deploy
```

Add env vars with `vercel env add NEXT_PUBLIC_SUPABASE_URL production` (repeat for the other two).

### Connect the domain to Supabase (required for auth flows)

`NEXT_PUBLIC_*` values are baked in at **build** time, and email-confirmation /
magic-link flows bounce through Supabase Auth — so both sides must agree on
the URL:

1. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL** → `https://<project>.vercel.app` (or your custom domain)
   - **Redirect URLs** → add `https://<project>.vercel.app/auth/callback` and
     `https://<project>.vercel.app/**`; keep `http://localhost:3000/**` for dev.
2. **Vercel → Settings → Environment Variables** — the same three vars under
   *Production*; redeploy after changing them (`NEXT_PUBLIC_*` are inlined at build).
3. Optional custom domain: Vercel → **Domains** → add it, then append
   `https://your-domain.com/auth/callback` to the Supabase redirect list too.

### Post-deploy smoke test

```bash
APP_URL=https://<project>.vercel.app \
SUPABASE_URL=https://kepjsrnrbnoxmxgobsff.supabase.co \
SUPABASE_ANON_KEY=<anon key> \
node scripts/e2e.mjs
```
