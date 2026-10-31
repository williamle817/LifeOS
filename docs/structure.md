# Structure

How the LifeOS repository is laid out, which file talks to which, and where to
look when something needs changing. Every page has its own doc beside this one;
this file is the map between them.

Last updated 2026-10-10.

---

## The repository

```
LifeOS/
  apps/web/              the Next.js app, the only app so far
  packages/contracts/    the types every layer agrees on
  tests/e2e/             end to end specs, one folder per module
  docs/                  these docs
  mvp/                   the frozen first version, kept for reference only
  CLAUDE.md              working notes for Claude Code: rules, decisions, traps
  package.json           workspace root, holds packageManager
  pnpm-workspace.yaml    picks up apps/* and packages/*
  playwright.config.ts   end to end config, test server on port 3100
```

`apps/api` (NestJS) arrives at Phase 4. Until then the browser talks to
Supabase directly, and every table has Row Level Security so it can only ever
read its own rows.

---

## Inside `apps/web`

```
apps/web/
  app/                    routes only, one folder per page
    layout.tsx            the shell every page sits in
    globals.css           shared tokens, Tailwind, body
    page.tsx              Dashboard (/)
    dashboard.css         Dashboard colours
    icon.svg              Dashboard tab icon
    schedule/             page.tsx   schedule.css   icon.svg
    academic/             page.tsx   academic.css   icon.svg
    finance/              page.tsx   finance.css    icon.svg
    fitness/              page.tsx   fitness.css    icon.svg
  components/             UI used by more than one page
  lib/                    logic used by more than one page
  modules/                one folder per feature
    schedule/             components/   lib/   tests/
    academic/             components/   lib/   tests/
    finance/              components/   lib/   tests/
    dashboard/            components/
  tests/                  tests for components/ and lib/, plus shared helpers
    helpers/              fake Supabase, jsdom setup
```

A module has the same three folders every time: `components/` for what it
renders, `lib/` for what it computes and stores, `tests/` mirroring both.
`dashboard/` has only `components/` because it has nothing to compute yet.
Folders are created when they are first needed, not ahead of time.

---

## Five rules that keep it in order

1. **A page file is thin.** `app/<page>/page.tsx` sets the tab title, imports
   its own CSS file and renders the module's view. No logic lives there.
2. **A module never imports another module.** Anything two modules need moves
   up to `components/` or `lib/`. That is what lets a module be moved or deleted
   as one folder.
3. **Only the stores touch the database.** `event-store.ts`, `course-store.ts`
   and `flow-store.ts` read and write their tables, and `lib/store.ts` asks who
   you are. Nothing else calls Supabase except signing in and out. When the
   NestJS backend arrives, only the inside of those files changes.
4. **`lib/from-schedule.ts` is the one bridge between modules.** Finance reads
   work shifts and meals out of the calendar through it, and writes back
   through it. Neither module knows the other exists.
5. **Every type that crosses a boundary comes from `packages/contracts`.**
   `LifeEvent`, `Course`, `Flow` and the lists of types and colours are
   defined once and imported everywhere.

---

## Page by page

| Route | Page file | Styles and icon | View | Store | Tables |
| --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | `dashboard.css`, `icon.svg` | in the page, plus `today-heading.tsx` | none yet | none yet |
| `/schedule` | `app/schedule/page.tsx` | `schedule.css`, `icon.svg` | `schedule-view.tsx` | `event-store.ts` | `users`, `events` |
| `/academic` | `app/academic/page.tsx` | `academic.css`, `icon.svg` | `academic-view.tsx` | `course-store.ts`, `selection.ts` | `semesters`, `courses`, `categories`, `grade_items` |
| `/finance` | `app/finance/page.tsx` | `finance.css`, `icon.svg` | `finance-view.tsx` | `flow-store.ts`, plus `lib/from-schedule.ts` | `flows`, and `events` read through the bridge |
| `/fitness` | `app/fitness/page.tsx` | `fitness.css`, `icon.svg` | `components/empty-state.tsx` | none yet | none yet |

The details of each live in `dashboard.md`, `calendar.md`, `academic.md`,
`finance.md` and `fitness.md`.

---

## Who imports whom

```
  app/<page>/page.tsx
        |   imports the view and ./<page>.css
        v
  modules/<page>/components/<page>-view.tsx
        |                                  \
        v                                   v
  modules/<page>/lib/*-store.ts         components/   shared UI
        |                               lib/          shared logic
        v
  lib/supabase.ts   ->   Supabase Postgres

  every layer   ->   packages/contracts
```

The one sideways path, and the only file allowed to take it:

```
  modules/finance/components/finance-view.tsx
        |
        v
  lib/from-schedule.ts     shiftsIn, mealsIn, saveFromSchedule, removeFromSchedule
        |                  also re-exports the event store's subscribe and snapshot
        v
  modules/schedule/lib/event-store.ts
```

### How a store reaches the screen

Every store is an external store: `subscribe`, `getSnapshot` and
`getServerSnapshot`, read in the view through React's `useSyncExternalStore`.
A write updates the cached list straight away, tells every subscriber, then
saves to Supabase and shows a banner if the save is refused.

The three stores are built by `createStore` in `lib/store.ts`, which holds
everything they have in common:

- asking the database who you are, once, for all three;
- loading a store the first time a page needs it;
- turning a refused write into the banner and reloading what is really saved;
- forgetting everything when a different person signs in;
- throwing away a reload that finishes after you changed something, so a slow
  read can never undo your last edit.

```
  click  ->  view  ->  store write  ->  cache updated  ->  view re-renders
                             |
                             v
                         Supabase
```

`components/stay-fresh.tsx` calls `refreshAll` in `lib/store.ts` whenever a tab
regains focus, so a second tab catches up with writes made in the first. It
reloads only the stores a page has already opened, and once, even though the
browser reports the return twice.

---

## The shell around every page

```
  <html>          Plus Jakarta Sans and Fraunces; data-theme set before the first paint
    <body>
      TopBar      brand mark, nav, theme toggle, sign out once signed in
      <main>
        AuthGate  the sign in form, or the page once there is a session
          StayFresh
          the page
```

`app/layout.tsx` holds all of it. A tiny script in `<head>` reads the saved
theme and sets `data-theme="night"` before anything is drawn, so a dark mode
user never sees a white flash.

### Shared components

| File | What it is |
| --- | --- |
| `topbar.tsx` | the floating bar across the top; on a phone the nav drops to a scrolling row of its own |
| `brand.tsx` | the two ring mark and the LifeOS name, used by the top bar and the sign in card |
| `nav.tsx` | the page links, built from `lib/nav.ts` |
| `icons.tsx` | every icon as an inline SVG path; there is no icon library |
| `auth-gate.tsx` | the sign in form, shown until there is a session, in the Dashboard's mint |
| `stay-fresh.tsx` | reloads the open stores when a tab regains focus |
| `theme-toggle.tsx` | the sun and moon button |
| `sign-out.tsx` | the sign out button, hidden until you are signed in |
| `modal.tsx` | overlay, centred card, Escape to close |
| `scope-ask.tsx` | the Apply to panel: this one, this and following, all |
| `reorder.tsx` | drag to reorder with a grip handle, used by Academic |
| `empty-state.tsx` | an icon, a large heading and a line of text for a page with nothing in it yet, plus whatever the page passes in below |
| `styles.ts` | the class names every page shares: main, quiet and soft buttons, the round icon button, inputs; and `tint`, an event colour as a style |
| `color-picker.tsx` | the row of six colour dots, used by the event form and the course form |
| `labeled.tsx` | a small caption above a field |
| `save-error.tsx` | the Could not save banner |

### Shared logic

| File | What it is |
| --- | --- |
| `nav.ts` | the list of pages, their labels, routes and icons; the one place to add a page |
| `supabase.ts` | the single Supabase client |
| `theme.ts` | the light and dark switch, saved as `lifeos.theme` in the browser |
| `store.ts` | what every store shares, see above, plus who is signed in |
| `dates.ts` | dates as `2026-03-10` strings: today, moving by days, counting days, `Mar 10` |
| `from-schedule.ts` | the Schedule to Finance bridge |

---

## Colour

**Components never contain a colour.** They use Tailwind classes such as
`bg-surface`, `text-ink` or `text-accent`, and each class reads a CSS variable.
Change the variable and every component that uses it follows.

```
  app/globals.css         base tokens, light and night
                          the fixed tokens: alert, money in, money out
                          the six event colours
                          the mapping from tokens to Tailwind classes
        |
        v
  app/<page>.css          redefines ten tokens for that page only:
                          canvas, surface, surface-muted, line, line-strong,
                          ink, ink-muted, ink-faint, accent, accent-soft
```

Each page file opens with a light block, and a night block only when the page
has night colours of its own:

```css
body:has([data-page="finance"]) { --canvas: ...; --surface: ...; }
:root[data-theme="night"] body:has([data-page="finance"]) { ... }
```

and the page's root element carries the matching `data-page`. Two reasons for
that shape:

- **Next keeps a page's stylesheet loaded after you leave the page.** A rule
  without the `data-page` condition would recolour every page visited
  afterwards. With it, the rule only matches while that page is on screen.
- **The tokens are set on `body`, so the top bar changes colour too.**

At night, `globals.css` sets the base night tokens on `body` as well, and that
beats a page's light block. So a page with no night block of its own shows the
base night colours: Academic has none, and Schedule's only changes the accent.

**The sign in screen has no page of its own.** It carries `data-page="login"`,
and `dashboard.css` lists it beside the Dashboard, so it is mint in both modes.
`auth-gate.tsx` imports `dashboard.css` itself, because before you sign in no
page is drawn and so no page stylesheet is loaded.

| Page | Colour | Accent (light) | Surface (light) |
| --- | --- | --- | --- |
| Dashboard | mint | `#05664b` | `#dcf2e6` |
| Schedule | graphite | `#2f3440` | `#f3f4f6` |
| Academic | blue | `#0059bd` | `#e0edff` |
| Finance | honey gold | `#7f5300` | `#f8e9d8` |
| Fitness | orange | `#a23504` | `#fee6de` |

No page shows pure white in light mode; every surface is a toned version of its
page colour. Every pair of text and background passes WCAG AA (4.5:1) on every
page in both modes, measured rather than judged by eye.

**What never changes from page to page:** `--alert`, `--money-in`,
`--money-out` and the six event colours. Red means the same thing everywhere,
and the event colours belong to your saved events, so a page may not retint
them.

**Each page has its own tab icon**, a white L on that page's accent, in
`icon.svg` beside its `page.tsx`. The icon cannot read CSS variables, so its
colour is written into the file. Change a page's accent and change its icon in
the same edit.

**Dark mode** is one switch for the whole app, the sun and moon button.
`lib/theme.ts` stores the choice; `globals.css` and the night blocks in the page
files supply the colours.

### The look, since 2026-10-31

Two fonts. **Plus Jakarta Sans** is the text, **Fraunces** with its soft axis
turned up is every large heading and every large number. Tailwind reaches them
as `font-sans` and `font-display`; the calendar title, which FullCalendar draws,
reads `--font-fraunces` in `schedule.css`.

Corners and shadows come from tokens in `globals.css`, never from one off
values: `rounded-field` for inputs, `rounded-card` for small boxes,
`rounded-panel` for the big ones, and `shadow-float`, `shadow-soft` and
`shadow-pop` from lightest to heaviest. The shadows are tinted with `--shade`,
the page's own ink in light mode and black at night, so a shadow on a blue page
is a deeper blue and not grey.

---

## Tests

```
pnpm test     606 unit tests (Vitest)
pnpm e2e      78 end to end tests (Playwright, a real browser)
```

| Where | Unit | End to end |
| --- | --- | --- |
| `modules/schedule/tests` and `tests/e2e/schedule` | 176 | 32 |
| `modules/academic/tests` and `tests/e2e/academic` | 233 | 25 |
| `modules/finance/tests` and `tests/e2e/finance` | 126 | 21 |
| `apps/web/tests`, for `components/` and `lib/` | 71 | |

Neither suite touches the real Supabase project. Unit tests swap in an in
memory client from `tests/helpers/fake-supabase.ts`. Sample data that several
test files build the same way lives in `modules/<page>/tests/factories.ts`. End to end tests write a
fake session into the browser and answer every database call from
`tests/e2e/support/fixtures.ts`. The end to end server builds into `.next-e2e`
so it can run beside your own `pnpm dev`.

---

## The docs

| File | Covers |
| --- | --- |
| `structure.md` | this map |
| `dashboard.md` | the home page |
| `calendar.md` | Schedule: events, repeating events, the calendar page |
| `academic.md` | semesters, courses, grading, what is due |
| `finance.md` | income and spending by month, shifts and meals from the calendar |
| `fitness.md` | the planned workout page |
| `../CLAUDE.md` | the working notes: rules, decisions and their reasons, traps |

---

## Adding a page

1. Add it to `lib/nav.ts`: label, route, icon. Add the icon path to
   `components/icons.tsx` if it is new.
2. Create `app/<page>/page.tsx`, thin, importing `./<page>.css`.
3. Create `app/<page>/<page>.css` with a light block, and a night block if the
   page needs its own night colours, scoped to `data-page="<page>"`, and put
   that attribute on the page's root element.
   Measure every text pair before choosing the colours.
4. Create `app/<page>/icon.svg`: the white L on the new accent.
5. Put its code in `modules/<page>/` with `components/`, `lib/` and `tests/`.
   The Vitest globs already include every module, so no config changes.
6. If it needs data from another module, add a file to `lib/` beside
   `from-schedule.ts`, never an import between modules.
