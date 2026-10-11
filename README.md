# SkillGRID

Direct 1:1 peer-to-peer skill exchange. Two people, reciprocal skills, one
session at a time — no tokens, no credits, no group calls.

**Stack:** Next.js 15 (App Router) · Tailwind CSS v4 · Supabase (Postgres,
Auth, Realtime, Edge Functions) · Jitsi Meet (embedded 1:1 video, in-app,
no accounts, free).

---

## 1. Prerequisites (external accounts)

| Service | What you need |
|---|---|
| [Supabase](https://supabase.com) | A project (free tier is fine). Project URL + anon key from **Project Settings → API**. |
| [Jitsi Meet](https://jitsi.org/jitsi-meet/) | Free, open source video. **No account and no API keys** — the 1:1 call is embedded directly in the session page via the [Jitsi Meet IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/) (participants never leave the app). Defaults to `jitsi.riot.im`; override with `NEXT_PUBLIC_JITSI_DOMAIN` (see §3). |
| Node.js | v20+ (v24 verified). |
| Supabase CLI | `npm i -g supabase` (v2 verified), or use `npx supabase`. |
| Docker | Only needed for fully local Supabase (`supabase start`). Skip it if you push to a hosted project. |

---

## 2. Database setup (external step — run once)

### Option A — hosted Supabase project (recommended)

```bash
supabase login                       # browser authorization, once
supabase link --project-ref YOUR_PROJECT_REF   # project ref = URL subdomain
supabase db push                     # applies all migrations
supabase db query -f supabase/seed.sql --linked   # inserts the skill catalog
```

`db push` applies, in order:

1. `supabase/migrations/20261006000001_schema.sql` — tables, FKs, indexes
2. `supabase/migrations/20261006000002_rls_policies.sql` — RLS on every table
3. `supabase/migrations/20261006000003_functions.sql` — triggers, match RPCs, views, grants
4. `supabase/migrations/20261006000004_realtime.sql` — realtime publication
5. `supabase/migrations/20261007000001_advisor_fixes.sql` — Supabase advisor hardening
6. `supabase/migrations/20261010000001_product_overhaul.sql` — profile onboarding fields, `DECLINED` state, notifications, blocking, reporting, validated session RPCs, filterable feed
7. `supabase/migrations/20261010000002_session_cleanup.sql` — `delete_session()` (participant removes a closed session)
8. `supabase/migrations/20261010000003_session_insert_lockdown.sql` — sessions are created only via `propose_session()`

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

## 3. Meeting rooms (embedded, no external step)

The edge function is already deployed to the hosted project. **No secrets or
external accounts are required** — Jitsi Meet is free and needs no API keys:

```bash
supabase functions deploy generate-meeting-link
```

The function is invoked by the client right after a provider accepts a
session (`status -> ACCEPTED`). It builds an unguessable
`https://<JITSI_DOMAIN>/skillgrid-<session-id>-<random>` room URL and stores it
in `sessions.meeting_link`, which the session page then renders as an
embedded in-app video call. It is idempotent: if a link already exists it is
returned unchanged.

> **Do not use `meet.jit.si`.** It now refuses to start a room until an
> authenticated moderator arrives, so both participants see *"The conference
> has not yet started, because no moderators have yet arrived"*. This is
> server-side policy — no `configOverwrite` can lift it.
>
> The host has to pass **two** checks, and it is easy to check only the first:
>
> 1. **It allows anonymous moderators** — otherwise you get the message above.
> 2. **It is framable** — if it sends `X-Frame-Options` or a
>    `Content-Security-Policy: frame-ancestors` list that excludes you, the
>    browser drops the iframe and the room is an empty box.
>    (`meet.ffmuc.net` passes 1 and fails 2: `X-Frame-Options: SAMEORIGIN`.)
>
> The app defaults to `jitsi.riot.im`, which passes both — verified with two
> participants, the first becoming moderator. To change it, set **both**:
>
> ```bash
> # client (build/dev)
> NEXT_PUBLIC_JITSI_DOMAIN=meet.example.org
> # edge function
> supabase secrets set JITSI_DOMAIN=meet.example.org
> supabase functions deploy generate-meeting-link
> ```
>
> Both must agree: the client embeds the domain, the function mints the link.
> Only the room *name* is stored server-side, so changing the domain later
> keeps existing sessions joinable.

> The room URL is only ever shown to the two session participants (the
> Realtime view + participant RLS). Hardening options for later: run your
> own Jitsi server and enable [JWT-gated rooms](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/#creating-a-new-meeting-using-external-apijs)
> for authenticated join-only access.

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
npm test            # unit tests (node --test on src/**/*.test.ts)
npm run build       # next build
npm run db:parse    # libpg_query syntax check of all SQL files
npm run e2e         # end-to-end smoke test (needs supabase start + npm run dev)
npm run simulate    # full user-flow simulation (SIM_EMAIL + SIM_PASSWORD)
npx supabase db advisors --linked   # Supabase security/performance advisors
```

`npm test` covers the pure business rules in isolation — the session state
machine (`src/lib/session.ts`), reciprocal matching (`src/lib/matching.ts`),
and skill-name normalization (`src/lib/skills.ts`).

`npm run e2e` drives the whole product over HTTP: middleware redirects,
authenticated SSR pages, discovery RPCs, RLS negatives, the session
lifecycle triggers (overlap, transitions, meeting-link gating), the
meeting-room edge function (Jitsi URL generation + idempotency), chat,
reviews, moderation, and the overhaul features — decline with a reason,
session/reminder notifications, content-immutability on notifications,
blocking, the member-report queue and `get_member_offered_skills`.
Target it at hosted by overriding `APP_URL`, `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (the test password is read from `E2E_PASSWORD` /
`.env.local`).

Both `e2e` and `simulate` **clean up after themselves**: they delete the
sessions they create via `delete_session()` and (for `simulate`) restore the
account's original bio and remove any skills they added — so no test residue
is left on a real account. The only row they leave behind is the report they
submit, resolved to `DISMISSED`; reports are an audit trail with no delete
policy, and the unique-open index means a re-run inserts a fresh one.

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
on `lower(skill_tags.name)` keeps the catalog clean). Flagged profiles and
blocked pairs are excluded. `public.get_marketplace_feed(p_search, p_offered,
p_wanted, p_only_direct, p_format, p_limit, p_offset)` returns every
matching profile with its two tag arrays plus an `is_direct_match` flag
computed against the caller; `p_format` filters on the member's preferred
`ONLINE` / `IN_PERSON` / `EITHER` format.

### RLS model (strict own-row, discovery via RPCs)

| Table | Who can read | Who can write |
|---|---|---|
| `profiles` | own row (direct); others only through `get_profile_directory()` / feed RPCs | own row; moderation fields admin-only (trigger) |
| `skill_tags` | any signed-in user | nobody via API (`add_skill_tag()` RPC only) |
| `user_skills` | own row | own row |
| `sessions` | the two participants | participants; **INSERT only via `propose_session()` RPC**, status transitions enforced by trigger |
| `messages` | session participants | participants, as themselves |
| `reviews` | participants of the session | reviewer; `COMPLETED` + participant checks via trigger |
| `notifications` | own row | own row (mark read / delete); rows are created by SECURITY DEFINER triggers |
| `blocks` | own rows (as blocker) | own rows |
| `reports` | own rows (as reporter) | own rows; readable by admins through `get_reports()` |
| `allowed_email_domains` | nobody (deny-all) | SQL only |

Trigger-enforced business rules (`20261006000003_functions.sql`):

- `check_session_overlap` — half-open range overlap prevention per participant (back-to-back allowed), `23514` on conflict
- `enforce_session_transition` — PENDING→ACCEPTED **provider only**; cancel by either; ACCEPTED→COMPLETED by either; terminal states locked; `meeting_link` only writable while ACCEPTED
- `validate_review` — session must be COMPLETED, reviewee must be the other participant
- `protect_moderation_fields` — only admins can change `is_admin` / `flagged` / `flag_reason`
- `enforce_email_domain` — allowlist gate on `auth.users` insert
- `handle_new_user` — creates `public.profiles` on signup

Notifications & safety rules (`20261010000001_product_overhaul.sql`):

- `notify_session_change` — writes one `SESSION_PROPOSED` / `_ACCEPTED` / `_DECLINED` / `_CANCELLED` / `_COMPLETED` notification per recipient per session (idempotent via a partial unique index)
- `notify_review` — writes one `REVIEW_RECEIVED` notification when a review is left
- `propose_session` / `respond_session` / `cancel_session` / `complete_session` — the validated, `SECURITY DEFINER` state-machine RPCs the app calls (the backend owns validation: blocked pairs, flagged providers, future scheduling, duration bounds, and the agreed teach/learn skills)
- `delete_session` — a participant may permanently remove one of their own **closed** sessions (cascades to messages/reviews/notifications) (`20261010000002_session_cleanup.sql`)
- `sessions_insert_requester` policy was dropped (`20261010000003_session_insert_lockdown.sql`) so sessions can only be created by `propose_session()`

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
                        ┌─(provider declines)────────────────▶ DECLINED   ┐
PENDING ────────────────┤                                                  ├─ terminal
   │                    └─(either cancels)───────────────▶ CANCELLED       ┘
   │
   └─(provider accepts, Jitsi room created)──▶ ACCEPTED ─┬─(either)────▶ COMPLETED ──▶ reviews unlock
                                                         └─(either cancels)─▶ CANCELLED
```

`DECLINED`, `COMPLETED`, and `CANCELLED` are terminal. Declining is distinct
from cancelling (it carries an optional `decline_reason`). A closed session
can be permanently removed from history by either participant via
`delete_session()`; an active one must be cancelled instead. Every transition
routes through the RPCs above, so direct REST writes can no longer skip the
rules.

Each session also carries a small shared **To do** list — what the swap will
cover (`public.session_todos`, migration
`20261011000002_session_agenda.sql`), readable and writable by the two
participants only. The session page shows it as a paper card, and the call shows
the same list as its to-do rail and as the first tab of the in-call sheet.

### Realtime

`messages`, `sessions` and `session_todos` are added to the
`supabase_realtime` publication. The chat view subscribes to `INSERT` on
`messages` (filtered by `session_id`) and `UPDATE` on `sessions` (status /
meeting link); the shared to-do list subscribes to `INSERT`/`UPDATE`/`DELETE`
on `session_todos`. RLS decides what each subscriber actually receives.

### Routes

| Route | Purpose |
|---|---|
| `/` | Landing (auto-redirects to marketplace when signed in) |
| `/login`, `/signup`, `/auth/callback` | Email auth + verification exchange |
| `/home` | Dashboard: what needs you now, next session, quick actions |
| `/marketplace` | Marketplace feed with Direct Match badges (centred `?q=` search) |
| `/matches` | Reciprocal Matching Hub |
| `/sessions`, `/sessions/[id]` | Session list (incoming/outgoing/upcoming/history), lifecycle actions, realtime chat, shared to do, reviews, report/block |
| `/sessions/[id]/precall` | Device check + join (standalone, no app shell) |
| `/sessions/[id]/room` | The call (standalone, ink in both themes): swap title + clock, to-do rail, one bar — Mic · Camera · Swap · More · End |
| `/messages` | Three-column conversation workspace |
| `/notifications` | In-app notifications with unread count |
| `/profile` | Profile picture, details, OFFERED/WANTED skill manager, blocked members |
| `/settings` | Appearance (light/dark) + account |
| `/help` | FAQ |
| `/admin` | Member reports queue + flag/unflag board (admins only) |

---

## 7. Project layout

```
supabase/
  migrations/            # append-only SQL migrations (schema → RLS → functions → realtime → …)
  seed.sql               # skill catalog + admin/allowlist snippets
  functions/generate-meeting-link/   # embedded Jitsi room generator (no secrets)
  config.toml
scripts/parse-sql.mjs    # SQL syntax validator (libpg_query)
scripts/e2e.mjs          # end-to-end smoke test (app + API + triggers + RLS)
scripts/simulate.mjs     # single-account product-flow simulation
src/
  app/                   # routes: (app)/, (room)/, (auth) login+signup, auth/callback
  components/            # marketplace, matches, chat, sessions, profile, settings, admin, layout
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
