# SkillGRID — agent guide

Direct 1:1 peer-to-peer skill exchange. Next.js 15 (App Router) · React 19 ·
Tailwind CSS v4 · Supabase (Postgres/Auth/Realtime/Edge Functions) · Jitsi Meet.

Read `README.md` for setup, architecture, RLS model, and the session lifecycle.
`SESSION.md` is a local dev log (gitignored) — update it after a work session,
never commit it.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run db:parse` | libpg_query syntax check of every SQL file |
| `npm run e2e` | End-to-end smoke test (needs `supabase start` + `npm run dev`) |
| `npm run simulate` | Single-account product-flow simulation (`SIM_EMAIL`/`SIM_PASSWORD`) |

## Hard rules

- **Never run `npm run build` while `npm run dev` is running** — the build
  clobbers the running server's `.next` directory. Stop dev first.
- **Migrations are append-only.** Add `supabase/migrations/<timestamp>_<name>.sql`;
  never edit an applied migration. Validate with `npm run db:parse`.
- **Never commit credentials.** `.env.local` is gitignored. `e2e`/`simulate`
  read passwords from the environment or `.env.local` and refuse to run when unset.
- **No `window.alert()` / `window.confirm()`, no `href="#"` dead links.**

## UI conventions

- Tailwind v4, **light mode only**. Brand + semantic tokens live in the `@theme`
  block and `@layer components` in `src/app/globals.css`.
- Reuse the existing primitives: `.btn-primary` / `.btn-secondary` / `.btn-danger`
  / `.input` / `.card` / `.skeleton` / chips. Don't hand-roll a second button style.
- Semantics: teal = primary, emerald = OFFERED, sky = WANTED, amber = direct match
  / attention, red = destructive. Hold these across new UI.
- Every error box uses `src/components/ui/Alert.tsx` (carries `role="alert"`).
- Accessibility is required: real `<label htmlFor>`, `aria-current` on active nav,
  visible focus states, `aria-live` for chat, ≥44px touch targets on primary actions.
- Copy: sentence case, plain language, no exclamation marks, no AI clichés. Never
  surface raw Postgres/Supabase error text — use the friendly-error mapping in
  `src/lib/errors.ts`.

## Before you finish

Run `npm run typecheck` and `npm run lint` (or `/check`). Green before done.
