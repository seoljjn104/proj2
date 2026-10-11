# SkillGRID — design system

The visual contract for the app. Read alongside `AGENTS.md` (code rules) and
`README.md` (architecture). This file records the decisions so UI work stays
consistent across sessions.

## The direction — "The Exchange"

An editorial-print language: a warm paper canvas, ink type, hairline rules and
generous rhythm. The two motifs are the **swap chip** (`You teach X ⇄ You learn
Y`) and the **grid** the brand is named for. Fraunces carries the display voice;
Geist carries the words.

Two modes: **light** is the paper you plan on, **dark** is the room's ink. The
semantics never move between modes — only their shades do. The **session room
stays ink in both modes**; it is never flipped mid-session.

## Principles

1. **Quiet, then precise.** Warm neutrals carry the layout; colour is reserved
   for meaning. A surface should read at a glance without decoration.
2. **One rhythm.** Section spacing, card padding and heading sizes are the same
   everywhere. New work adopts the existing rhythm rather than inventing one.
3. **Colour means something.** Never use a semantic colour as ornament. If a
   teal/green/blue/amber/red element appears, it is because it carries the
   meaning below.
4. **Mobile is a first-class layout.** Primary actions go full width on small
   screens, fields stack, touch targets are ≥44px. `100dvh`, not `100vh`.
5. **Copy is plain.** Sentence case, no exclamation marks, no AI clichés, no em
   dashes in prose. Never surface raw Postgres/Supabase error text.

## Colour semantics (locked)

| Meaning | Colour | Where |
|---|---|---|
| Primary / brand action | teal | `.btn-primary`, active nav, links, `.chip-teal` |
| OFFERED (skills I teach) | emerald | `.chip-offered` |
| WANTED (skills I want to learn) | sky | `.chip-wanted` |
| Direct match / attention | amber | `.badge-direct`, match-card border |
| Destructive / declined | red | `.btn-danger`, declined status |
| Neutral / done | ink | completed & cancelled status, structure |

Teal is *not* OFFERED. Emerald is *not* a success toast. Keep them separate.

## Tokens

Defined in `src/app/globals.css`.

**How the retheme works.** The app was written against Tailwind's neutral scale
(`slate-*`), `white` and the semantic hues. Rather than rewrite every screen at
once, the palette *scales* are remapped in `@theme` to the Exchange palette:
`slate-*` now means paper/ink, `teal-*` means brand, and so on. Every remapped
step points at a `--gg-*` variable, so the whole app flips with a single block
under `:root[data-theme="dark"]`.

- `--gg-*` — the raw palette: `--gg-paper`, `--gg-surface`, `--gg-surface-2`,
  `--gg-ink`, `--gg-ink-2`, `--gg-ink-3`, `--gg-line`, `--gg-brand`,
  `--gg-offered`, `--gg-wanted`, `--gg-amber`, `--gg-red`, `--gg-on-brand`.
- Semantic utilities — `bg-paper`, `bg-surface`, `bg-surface2`, `text-ink`,
  `text-ink2`, `text-ink3`, `border-line`, `border-line2`, `text-onbrand`.
  **Prefer these in new work.**
- `--font-display` — Fraunces, loaded in `src/app/layout.tsx`. Apply with the
  `.display` class (headings that carry the editorial voice).
- Shadows — `--shadow-card`, `--shadow-lift`, `--shadow-panel`, warm-tinted.

When migrating an old surface, swap raw `slate-*`/`bg-white` for the semantic
utilities; reach for `.card`, `.panel`, `.input` and the chips before writing
utility soup.

## Theme

- **Two modes, and only two: `light` · `dark`.** There is deliberately no
  "follow the system" option.
- `ThemeProvider` (`src/components/theme/ThemeProvider.tsx`) owns the choice,
  persisted to `localStorage` under `skillgrid-theme`. A legacy `"system"` value
  is migrated once — resolved from the OS media query, then written back as a
  concrete mode.
- `THEME_INIT_SCRIPT` runs before paint so the first frame is already correct.
- `data-theme` and `color-scheme` are set on `<html>`.
- `ThemeToggle` (`src/components/ui/ThemeToggle.tsx`) is the quick control in the
  chrome — one press flips light ⇄ dark. It sits in the top bar on desktop **and**
  mobile. The labelled Light/Dark switch lives on `/settings`.
- The session room ignores the theme entirely (see Call flow).

## Avatars

- `profiles.avatar_url` holds a public URL into the `avatars` Storage bucket.
- Uploads are `avatars/<user id>/avatar-<timestamp>.<ext>`, so a replacement gets
  a fresh URL (no stale CDN copy). The previous file is deleted best-effort.
- `Avatar` (`src/components/ui/Avatar.tsx`) takes an optional `src` and falls
  back to initials — always render the name as text beside it.
- Other members' avatars come through `get_profile_directory`,
  `get_marketplace_feed` and `get_reciprocal_matches`, which all return
  `avatar_url`.

## Settings

`/settings` is reached from the account menu (it is not a nav row). It holds
**Appearance** (the labelled Light/Dark switch) and **Account** (who you're
signed in as, a link to your profile, sign out). Profile editing stays on
`/profile`; settings is the home for the app-level choices.

## Primitives (reuse, don't re-roll)

All live in `@layer components` in `globals.css`.

- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-danger`. All share
  `min-h-10`, rounded-md, focus ring, `active:scale-[0.98]`. Primary uses
  `--gg-brand` fill with `--gg-on-brand` text (works in both modes).
- **Fields:** `.input` (text, select, textarea).
- **Surfaces:** `.card` (rounded-xl, hairline, `p-5`, card shadow);
  `.card-interactive` (hover lift + teal border); `.panel` (borderless inset well
  *inside* a card — never a card in a card).
- **Chips:** `.chip-offered`, `.chip-wanted`, `.chip-teal`, `.badge-direct`.
- **Chrome:** `.surface-blur` for sticky headers/mobile top bar.
- **Loading:** `.skeleton` (height should match the element it replaces).
- **Layout:** `.eyebrow` (small uppercase label + teal mark, used by
  `PageHeader` only — one per page).
- **Headings:** `.display` for the editorial display face; `.section-title` for
  section `<h2>`s. Do not use uppercase micro-labels as headings.
- **Motif:** `.grid-motif` (faint blueprint, masked), `.auth-bg`, `.brand-panel`
  for full-screen auth/error surfaces.
- **Motion:** `.animate-fade-up`. Overlays use `motion-safe:animate-[...]`.
  Everything is disabled under `prefers-reduced-motion`.

## Components

- `src/components/ui/` — `PageHeader`, `EmptyState`, `Alert`, `Avatar`,
  `BrandMark`, `ConfirmDialog`, `ThemeToggle`.
- `src/components/theme/` — `ThemeProvider`.
- `src/components/layout/` — `AppNav` (desktop sidebar), `TopBar`,
  `MobileTabBar`, `AccountMenu`, `NotificationsMenu`, `PageShell`, `NavItem`,
  `icons.tsx`.
- Feature components live beside their route's domain: `home/`, `marketplace/`,
  `matches/`, `sessions/`, `messages/`, `notifications/`, `profile/`,
  `moderation/`.

### App shell (Option A)

One shell for the whole signed-in app, assembled in `src/app/(app)/layout.tsx`:

- **Desktop (≥ lg):** `AppNav` sidebar (236px, collapsible to 76px) + a content
  column. Each page wraps its body in `PageShell`, which caps content at
  **1400px**, centres it, and takes an optional `rail` rendered as a 384px right
  column at lg and up.
- **Below lg:** the sidebar and rail are dropped. `TopBar` and `MobileTabBar`
  carry the five destinations — Home · Browse · Matches · Sessions · Messages.
- **Top bar:** search sits centred on the bar (desktop) and collapses to an icon
  (mobile); the bell, theme toggle and account avatar sit to the right — the same
  four controls on both breakpoints.
- **Account menu** (`AccountMenu`) is the only home for profile, notifications,
  settings, help and sign out — reachable from the avatar on the top bar. Profile
  is **not** a nav row. It is deliberately *not* duplicated in the sidebar
  footer: a 256px panel inside a 236px rail clamps off the left edge of the
  viewport.
- The wordmark always points at `/home`.

### Call flow — pre-call + room

Two routes live **outside** the app shell, in their own group
(`src/app/(room)/layout.tsx`), so a call is never framed by the sidebar:

| Route | Purpose |
|---|---|
| `/sessions/[id]/precall` | Device check. Live camera preview, mic level meter, camera/mic pickers, then **Join now** or **Join with camera off**. |
| `/sessions/[id]/room` | The call itself: a header (**back · the swap · the clock**), the session's **To do** rail, Jitsi's media filling the stage, and one **centred bar** at the bottom. |

- **Ink in both themes.** The `(room)` layout pins `#12100b` and the warm light
  text ramp, so a call never flips between light and dark mid-session.
- **Our chrome, not Jitsi's.** `MeetingRoom` runs in `headless` mode:
  `prejoinConfig/prejoinPageEnabled` off, `toolbarButtons: []` and
  `TOOLBAR_BUTTONS: []`, watermarks suppressed.
- **One bar: Mic · Camera · Swap · More · End** (`CallRoom`). Everything else
  lives in a single sheet behind **More** — `CallPanel`, with the tabs **To do /
  Chat / Settings**, plus hand raise, screen share and Sketch. The sheet is the
  phone drawer and the desktop sheet at once. **No captions, by design.**
- **The layouts are Jitsi's own, and we say so.** The IFrame API never hands over
  the video tracks, so our own tiles — partner big, you in the corner, a grid with
  empty seats — are impossible without moving to lib-jitsi-meet. The stage
  therefore chooses among Jitsi's own views: **Side by side** (its tile view, the
  default), **Speaker** (pin the other person with `setLargeVideoParticipant`)
  and **Grid**. `setStage()` is the only place that sends `toggleTileView` /
  `setLargeVideoParticipant`, so the bar and the sheet cannot drift apart.
- **Applying the drawn default takes care.** Jitsi opens in its own speaker
  layout, `tileViewEnabled` in the config is a no-op, and Jitsi reports a
  tile-view state *before* the room exists — so nudging on that first report
  fires into the void. The default is applied once from
  `videoConferenceJoined`; `tileViewChanged` keeps the state honest after.
- **The swap is named.** `teach_tag_id` is validated against the requester's
  OFFERED skills and `learn_tag_id` against the provider's, so the title is
  *requester teaches ⇄ provider teaches* — the same words on the session page and
  in the room, where the stage chip also names what the other person brought. A
  session carrying no skills falls back to **Call with \<partner\>**.
- **Sketch is local to this device.** The pad opens full screen and says so.
  Sharing one needs a shared canvas to have a home in the schema first.
- **Resilient room name.** `meeting_link` only ever supplies the room name, so
  the room falls back to a deterministic `skillgrid-<session id>` when the link
  hasn't been generated yet. An accepted session can always be joined.
- **The embed host must pass two checks, not one.** (1) It must let the first
  participant become moderator *anonymously* — `meet.jit.si` does not, and
  stalls on *"no moderators have yet arrived"*. (2) It must be *framable* —
  `meet.ffmuc.net` allows anonymous rooms but sends `X-Frame-Options:
  SAMEORIGIN`, so the iframe is blocked outright. `JITSI_DOMAIN`
  (`src/lib/room.ts`, from `NEXT_PUBLIC_JITSI_DOMAIN`) defaults to
  `jitsi.riot.im`, which passes both; the `generate-meeting-link` edge function
  reads the matching `JITSI_DOMAIN` secret. The "open in a new tab" fallback is
  rebuilt from the room name + domain, so it never points at a stale host.
- The session page carries a **Prepare and join** card instead of embedding the
  iframe; `⬅` and **Leave the call** both return to the session.

### To do

Every session carries a **To do** list — the things the two of you agreed to
cover — as a paper card on the session page and as the first tab of the call
sheet, so both people agree before they join the call. One data layer
(`useSessionTodos`) serves both presentations: nothing forks.

- `public.session_todos` (migration `20261011000002_session_agenda.sql`) holds
  one row per item — `session_id`, `created_by`, `body` (1–200 chars), `done`.
- RLS mirrors `messages` exactly: only the two session participants can read or
  write. INSERT additionally pins `created_by` to the caller. UPDATE is
  participant-scoped *on purpose*, so either person can tick off an item the
  other added — a trigger stops `created_by`/`session_id` being rewritten
  instead.
- `SessionTodoList` (`src/components/sessions/`) renders the paper card: title
  **To do**, the add button labelled **Add to do**, an `n of m done` counter, and
  live updates over Realtime so both people see the list change. The drawn
  `+ Add to do` row is implemented as a labelled input plus a button, so it needs
  no click-to-edit.
- In the room the same list comes back as the **To do** rail — one segment per
  item, `Now: … · n of m` — and as the sheet's first tab, where either person can
  add, tick or remove an item mid-call.
- The name is **To do**, never "Agenda": round 11 renamed it and round 16 draws
  the session page that way.
- Ticking is optimistic: a controlled checkbox must not snap back while the
  write is in flight.

### Messages and notifications

- **Messages** is a three-column workspace: the shell's sidebar is the nav, then
  `MessagesWorkspace` renders threads (360px) beside the open conversation. The
  conversation pane is desktop-only — on phones a tap opens the session page.
  Threads sort newest-first and show a teal dot while a reply is owed.
- **Notifications** is a dropdown in the top bar (`NotificationsMenu`): the six
  newest events, the unread count on the bell, **Mark all read**, and **View
  all** through to `/notifications`.
- The sidebar carries a count badge on **Matches** (reciprocal matches).

### PageHeader

Eyebrow + `h1` + optional subtitle on the left; optional count chip and action
on the right. The right cluster only renders when there is something in it.

### EmptyState

Branded card with grid motif, motif icon, title, body and optional action. Use it
for every "nothing here" state so empties never look unfinished.

## Accessibility

- Real `<label htmlFor>` on every field.
- `aria-current` on the active nav row; `aria-pressed` on toggles;
  `aria-live="polite"` on the chat log; `role="status"` on inline confirms.
- Errors use `Alert` (`role="alert"`).
- Visible focus everywhere (`:focus-visible` outline, 2px brand).
- Touch targets ≥44px on primary mobile actions.
- Body/secondary text must clear 4.5:1 in **both** modes. `--gg-ink-3` is the
  muted floor; do not go lighter for text.

## Error copy

Map database/function errors through `src/lib/errors.ts`
(`friendlyDbError`, `friendlyFunctionError`) before display.

## Conventions for new work

1. Start from `PageHeader` + the existing rhythm (`mt-6`, `space-y-6`,
   `gap-6`). Don't introduce new top-level spacing.
2. Reach for a primitive or a semantic utility before raw scale steps.
3. Check the semantic table before choosing a colour.
4. Test the surface in **both** modes. Anything that must stay dark (the session
   room, overlays) uses an explicit ink, never `bg-slate-900`.
5. Design the phone layout explicitly, then let it grow with `sm:`/`lg:`.
6. Run `npm run typecheck` and `npm run lint` before finishing.
