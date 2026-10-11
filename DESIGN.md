# SkillGRID — design system

The visual contract for the app. Read alongside `AGENTS.md` (code rules) and
`README.md` (architecture). This file records the decisions so UI work stays
consistent across sessions. Light mode only.

## Principles

1. **Quiet, then precise.** Neutral slate carries the layout; colour is
   reserved for meaning. A surface should read at a glance without decoration.
2. **One rhythm.** Section spacing, card padding, heading sizes and empty
   states are the same everywhere. New pages adopt the existing rhythm rather
   than inventing one.
3. **Colour means something.** Never use a semantic colour as ornament. If a
   teal/green/blue/amber/red element appears, it is because it carries the
   meaning below.
4. **Mobile is a first-class layout.** Primary actions go full width on small
   screens, fields stack, and touch targets are ≥44px. `100dvh`, not `100vh`.
5. **Copy is plain.** Sentence case, no exclamation marks, no AI clichés, no
   em dashes in prose. Never surface raw Postgres/Supabase error text.

## Colour semantics (locked)

| Meaning | Colour | Where |
|---|---|---|
| Primary / brand action | teal | `.btn-primary`, active nav, links, `.chip-teal` |
| OFFERED (skills I teach) | emerald | `.chip-offered` |
| WANTED (skills I want to learn) | sky | `.chip-wanted` |
| Direct match / attention | amber | `.badge-direct`, match-card border |
| Destructive / declined | red | `.btn-danger`, declined status |
| Neutral / done | slate | completed & cancelled status, structure |

Teal is *not* OFFERED. Emerald is *not* a success toast. Keep them separate.

## Tokens

Defined in `src/app/globals.css` via Tailwind v4 `@theme`:

- `--font-sans` — Geist (loaded in `src/app/layout.tsx`).
- `--shadow-card` — resting elevation.
- `--shadow-lift` — hover elevation (used by `.card-interactive`).
- `--shadow-panel` — overlays: drawer, modal.
- Background `#f8fafc`, foreground `#0f172a`, selection teal-tinted.

Shadows are tinted with the cool slate hue — never pure black.

## Primitives (reuse, don't re-roll)

All live in `@layer components` in `globals.css`.

- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-danger`. All share
  `min-h-10` (40px; pair with `w-full sm:w-auto` on mobile primary actions),
  rounded-lg, focus ring, `active:scale-[0.98]`.
- **Fields:** `.input` (text, select, textarea).
- **Surfaces:** `.card` (rounded-2xl, border, `p-5`, card shadow);
  `.card-interactive` (hover lift + teal border); `.panel` (borderless
  `slate-50` well *inside* a card — never a card in a card).
- **Chips:** `.chip-offered`, `.chip-wanted`, `.chip-teal`, `.badge-direct`.
- **Loading:** `.skeleton` (height should match the element it replaces).
- **Layout:** `.eyebrow` (small uppercase label + teal mark, used by
  `PageHeader` only — one per page).
- **Headings:** `.section-title` for section `<h2>`s. Do not use uppercase
  micro-labels as headings.
- **Motif:** `.grid-motif` (faint blueprint, masked), `.auth-bg`,
  `.brand-panel` for full-screen auth/error surfaces.
- **Motion:** `.animate-fade-up` (page/header entrance). Overlays use
  `motion-safe:animate-[...]`. Everything is disabled under
  `prefers-reduced-motion`.

## Components

- `src/components/ui/` — `PageHeader`, `EmptyState`, `Alert`, `Avatar`,
  `BrandMark`, `ConfirmDialog`.
- `src/components/layout/` — `AppNav` (desktop sidebar + mobile drawer),
  `NavItem`, `NotificationBell`, `icons.tsx`.
- Feature components live beside their route's domain: `marketplace/`,
  `matches/`, `sessions/`, `notifications/`, `profile/`, `moderation/`.

### PageHeader

Eyebrow + `h1` + optional subtitle on the left; optional count chip and
action on the right. The right cluster only renders when there is something
in it. Actions should not need a second copy of the page title.

### EmptyState

Branded card with grid motif, motif icon, title, body and optional action.
Use it for every "nothing here" state so empties never look unfinished.

## Accessibility

- Real `<label htmlFor>` on every field.
- `aria-current` on the active nav row; `aria-pressed` on toggles;
  `aria-live="polite"` on the chat log; `role="status"` on inline confirms.
- Errors use `Alert` (`role="alert"`).
- Visible focus everywhere (`:focus-visible` outline, 2px teal).
- Touch targets ≥44px on primary mobile actions.

## Error copy

Map database/function errors through `src/lib/errors.ts`
(`friendlyDbError`, `friendlyFunctionError`) before display.

## Conventions for new work

1. Start from `PageHeader` + the existing rhythm (`mt-6`, `space-y-6`,
   `gap-6`). Don't introduce new top-level spacing.
2. Reach for a primitive before writing utility soup. If a treatment repeats
   on a second surface, promote it into `@layer components`.
3. Check the semantic table before choosing a colour.
4. Design the phone layout explicitly, then let it grow with `sm:`/`lg:`.
5. Run `npm run typecheck` and `npm run lint` before finishing.
