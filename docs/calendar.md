# Calendar

Schedule is the heart of LifeOS. Money, Academic and Fitness will all derive
their numbers from `events`, so the shape of that one table decides the rest of
the project. Read this before changing anything under `apps/web/modules/schedule`.

Written 2026-09-25, end of the Supabase work. Last updated 2026-10-10.

---

## Layers

Each layer talks only to the one below it, so replacing one does not drag the
other three along.

```
  PAGE          app/schedule/page.tsx imports the view and schedule.css
                      |
  UI            schedule-view.tsx     FullCalendar, drag, popover
                event-form.tsx        the smart form
                event-details.tsx     the read only card
                      |
  RECURRENCE    recurrence.ts         one rule  ->  many occurrences
                      |
  STORE         event-store.ts        read, write, undo
                      |
  CONTRACT      packages/contracts    the type every layer agrees on
                      |
  DATABASE      Supabase Postgres     users + events
```

Everything above the contract lives in `apps/web/modules/schedule`, components
in `components/`, the other two in `lib/`, and the tests that cover them in
`tests/`. The **Apply to** panel, `scope-ask.tsx`, is shared with Finance and so
lives in `apps/web/components`. Nothing outside the module imports from inside
it except the route at `app/schedule/page.tsx` and two bridges in
`apps/web/lib`: `from-schedule.ts`, through which Finance reads shifts and
meals, and `for-dashboard.ts`, through which the Dashboard reads today's
events.
`structure.md` shows how the whole app fits around it.

Two things this buys:

**`event-store.ts` is the only file that knows the database exists.** No
component calls Supabase. When Phase 4 swaps in NestJS, only the inside of that
file changes.

**`packages/contracts` sits outside `apps/web`** so `apps/api` can reuse the
same definition instead of copying it.

---

## Database

```
  auth.users          Supabase owns this, never referenced directly
       |
       | auth_id
       v
  public.users        OUR table
       |  id
       |
       | user_id
       v
  public.events       every event, and every future module reads from here
```

### Why `public.users` exists

This is the single most important decision in the design.

Supabase keeps people in `auth.users` under a UUID it issues. If
`events.user_id` pointed straight at that, then the day Cognito arrives
(Phase 10) it would issue different UUIDs and **every event would be orphaned**.

So events point at our own `public.users.id`, which never changes, and that row
carries an `auth_id` naming whichever provider is current. Switching provider is
an update of `auth_id` on two rows.

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key, never changes |
| `auth_id` | uuid | Supabase today, Cognito later |
| `created_at` | timestamptz | when the row appeared |

A trigger on `auth.users` inserts the matching `public.users` row on signup, so
an account can never exist without a profile.

### `events`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key |
| `user_id` | uuid | owner, references `public.users.id` |
| `type` | text | general, work, gym, dining, class |
| `title` | text | what the block shows |
| `start_at` | text | see the note below, not a timestamp |
| `end_at` | text | same |
| `all_day` | boolean | lives in the all day row when true |
| `color` | text | blue, red, yellow, green, pink, slate |
| `notes` | text | free text |
| `series_id` | uuid | groups a repeating series |
| `recurrence` | jsonb | the repeat rule, only on a series head |
| `occurrence_date` | text | which occurrence this row overrides |
| `cancelled` | boolean | this occurrence was deleted on its own |
| `data` | jsonb | the per type fields |

### Two columns that look wrong and are not

**`start_at` is `text`, not `timestamptz`.** It carries two shapes. A timed
event stores a full ISO string, `2026-09-24T14:00:00.000Z`. An all day event
stores a date only string, `2026-09-24`. Date only matters: converting local
midnight to UTC can land on the previous day at a positive offset, which moves
the event a day. Read the range from FullCalendar's `startStr` and `endStr`,
never from `start.toISOString()`. Dragging an all day event used to break this
rule and save it as a timestamp; at the time zone of Vietnam the form then
showed it a day early. Both creating and dragging read the strings now.

Also note FullCalendar treats an all day `end` as **exclusive**. A one day event
on 24 September stores `end_at` as `2026-09-25`. The form subtracts a day when
it loads and adds it back on save, so the user sees the day it happens.

**`data` is jsonb, not a column per field.** Each type carries its own fields:
work has `place`, `wage` and `tips`, gym has `workout` and `calories`, dining
has `place` and `amount`, class has `course`. One
jsonb column means adding a field to one type needs no migration, and Postgres
still queries it with `data->>'amount'`. Phase 6 can normalise if Money wants
real columns.

### Ownership is enforced in the database

Both tables have Row Level Security on. The check lives in Postgres, not in the
browser, so even a direct API call with the public key only returns that
person's rows. The client is not trusted.

---

## Recurrence

The rule is stored. Occurrences are never written in advance.

Materialising every occurrence cannot answer "repeat weekly with no end date",
because there is no last row to write. Storing the rule and expanding only the
visible range does, and scrolling to the year 2126 still computes correctly.

`events` therefore holds three kinds of row, told apart by `recurrence` and
`occurrence_date`.

| Row kind | `recurrence` | `occurrence_date` | `cancelled` |
| --- | --- | --- | --- |
| Plain event | empty | empty | false |
| Series head | the rule | empty | false |
| Override | empty | the date it replaces | false |
| Cancellation | empty | the date it removes | true |

Weekly gym, second week moved, fourth week skipped:

```
  DATABASE  (3 rows)               SCREEN  (expanded)

  head                             01/09  from the rule
  weekly from 01/09                08/09  from the override, different time
                                   15/09  from the rule
  override 08/09                   22/09  SKIPPED
  moved to 20:00                   29/09  from the rule

  cancel 22/09
```

Three rows produce an unbounded number of blocks.

### The rule itself

```json
{ "freq": "weekly", "interval": 1, "byDay": [1, 3, 5], "until": "2026-12-31" }
```

* `freq` is daily, weekly, monthly or yearly
* `interval` is how many units between occurrences, 2 means every other
* `byDay` only applies to weekly, 0 is Sunday through 6 is Saturday. This is
  what the Custom panel writes
* `until` absent means forever

Custom is not a fifth frequency. It is `weekly` plus `byDay`.

### Expansion, and the trap inside it

`recurrence.ts` exports `expand(rows, from, to)`. It emits occurrences inside
the window plus one day of slack on each side, consulting a map of overrides and
cancellations keyed by `seriesId::date`.

The first version stepped from the series start one occurrence at a time behind
a 2000 iteration guard. Weekly from 2026 to 2126 is 5200 steps, so the guard cut
off around 2064 and scrolling far ahead showed **nothing at all**. `seek()` now
jumps straight to the first occurrence at or after the window, using arithmetic
rather than iteration, and the loop only ever runs inside the visible range.

**Every occurrence is worked out from the series start, never from the one
before it.** Stepping from the previous one drifted: a monthly event on 31
January landed on 3 March, then on the 3rd for good. Now the nth occurrence is
the start plus n months, and a day the month does not have is pulled back to
the month's last day, so the 31st shows on 28 February and on 31 March again.
A 29 February yearly event shows on the 28th in other years. Finance pulls a
late day back the same way.

**An occurrence keeps the clock time, not the number of hours since
midnight.** The old way added the event's offset from midnight, so on the
night the clocks change a 9 AM event showed at 10. Moving the date with the
calendar keeps it at 9. An all day occurrence also keeps its length now;
before, every repeat of a two day event ended the day it started.

Each emitted occurrence carries the rule. That looks redundant but the form
needs it: without it, opening a repeating event showed "Does not repeat" and
lost every chosen weekday. Series head and occurrence are told apart by
`occurrence_date`, not by the presence of the rule.

---

## Edit and delete scopes

Clicking Save or Delete on a repeating event asks which occurrences it applies
to. All three are cheap.

| Scope | Edit | Delete |
| --- | --- | --- |
| This event | write one override row | write one cancellation row |
| This and following | close the old rule with `until`, insert one new head | set `until` on the head |
| All events | update the head in place | delete the head and its patches |

"This and following" is a **rule split**, not a pile of exceptions. The old rule
gets `until` set to the day before, and a brand new head starts at the clicked
occurrence with its own `series_id`. That keeps the row count at plus one no
matter how long the series runs, and it is what lets you change daily to weekly
from a given Saturday onward.

Two bugs lived here and are worth not repeating:

**The new head inherited the old rule.** Changing daily to weekly and picking
"this and following" left the tail still daily, because the split copied
`head.recurrence` instead of the rule the form had just built.

**"All events" moved the series start.** The handler wrote the clicked
occurrence's `start` onto the head, which dragged the series start forward and
made every earlier occurrence vanish. It now keeps the head's date and takes
only the time of day, preserving the duration.

---

## What a block gives you

Clicking a block opens a read only card: the title, the day, the time, and
whatever that kind of event carries. A shift shows where it was worked, a gym
session shows the workout and the calories, a meal shows the place, a class shows
the course. Pay is deliberately left out; it is there for Money, not for reading
back at a glance.

Three buttons sit in the corner, in this order: edit, duplicate, delete.

**Duplicating a repeating event asks the same question as editing one.** Copy
just this occurrence and you get a single standalone event. Copy this and
following and you get a fresh series starting that day. Copy all events and you
get the whole series again from its original start. The original is never
touched, and Ctrl+Z undoes the copy.

**One panel asks that question for everything.** Editing, deleting, duplicating
and dragging all raise the same three choices under the heading **Apply to**.
Anything added later that touches a series should reuse it rather than invent its
own wording.

---

## The page

The calendar fills the whole window under the top bar, as one sheet with
rounded top corners, and **the page itself never scrolls**: only the grid of
hours does, inside the calendar.

```
  top bar
  October 2026  <  >  Today               New event  [Day Week Month]
  -----------------------------------------------------------------
        Mon 5      Tue 6      ...                  stays put
  -----------------------------------------------------------------
  All day                                          stays put
  -----------------------------------------------------------------
  8 AM                                             scrolls
  9 AM
```

How that is built, all in `app/schedule/schedule.css` and `schedule-view.tsx`:

* The calendar is given `height="100%"`. FullCalendar then builds its own
  scrolling area, which is what keeps the day names and the all day row in
  place without any sticky positioning.
* The window frame is fixed to the screen height on this page only, and the
  page padding is removed, through `body:has([data-page="schedule"])`.
* It opens at **8 AM** through FullCalendar's own `scrollTime`. An older
  version scrolled there by hand and needed two numbers tied to the height of
  the top bar; both are gone.
* The toolbar runs edge to edge with a line under it: the month in Fraunces,
  round arrows and Today on the left, **New event** and a segmented Day, Week,
  Month switch on the right. On a phone it stacks, centred: the month, then
  the arrows and Today, then New event and the switch.
* **New event** opens the same form a click on an empty slot does, for the next
  full hour, one hour long. It is a FullCalendar custom button, so it sits in
  the toolbar FullCalendar draws.
* Each day name has its date under it in a circle, filled with the accent on
  today, and **today's whole column carries a pale wash**,
  `--fc-today-bg-color` at 45 percent of `accent-soft`.
* **Today hides while today is on screen.** FullCalendar disables it then, and
  a disabled grey button read as broken; it is `visibility: hidden`, so the
  arrows never move when it comes back.
* **A phone opens on 3 Days**, yesterday to tomorrow, because seven columns at
  390px cut every title to a few letters. It is a FullCalendar view,
  `timeGridThreeDay`, also offered on the switch everywhere; the switch to it
  happens in an effect on mount, through the calendar's ref, when
  `matchMedia("(width < 48rem)")` matches.

The columns are wider than they were inside a card, so a Vietnamese title like
"Ca sáng quán cà phê" now fits in a week view block instead of being cut short.

### The all day row is framed the same way top and bottom

```
  day names
  1px  line
  3px  pale band
  All day
  3px  pale band
  1px  line
  hours
```

Every one of those lines belongs to a cell that spans the full width. A line
drawn by one of the inner tables would stop short of the right edge on a
computer with visible scrollbars, because the inner tables leave room for the
scrollbar. That is how a cut off line under the day names went unnoticed until
it was seen on Windows.

---

## Colour

The calendar page is **graphite**, a cool dark grey, so the only colour on the
grid is the colour of your events. Its palette is the first two blocks of
`app/schedule/schedule.css`. At night only the accent pair is its own; the rest
is the app's base night palette from `globals.css`:

```
light  canvas #e0e3e7   surface #f3f4f6   surface-muted #d9dbe1
       line #c9ccd3     line-strong #afb4be   accent-soft #d3d7e0
       ink #1b1c1e      ink-muted #47494d     ink-faint #515357
       accent #2f3440
night  canvas #101216   surface #1b1e25   surface-muted #262a33
       line #333844     line-strong #4a5160   accent-soft #2b2f38
       ink #f3f5f9      ink-muted #aeb6c4     ink-faint #949cab
       accent #c9ced8
```

The tab icon is `app/schedule/icon.svg`, a white L on `#2f3440`.

**The grid is one step lighter than the other pages' surfaces**, `#f3f4f6`.
The event fills are light pastels, and a grid as deep as the rest of the app
made the green and yellow blocks melt into it, leaving only their outlines.

**The six event colours are not the page's to change.** Blue, red, yellow,
green, pink and slate are stored on your events, so they look the same on
every page and in both modes: a pastel fill, a darker line, and text in a deep
shade of the same colour. Retinting one of them to suit a page would repaint
every event you have saved. It was tried once, to get blue out of Academic, and
every block on the calendar turned purple.

**Blue is also the colour of an event with no colour chosen**, and the form
uses it as a marker: an event saved with the default colour stores no colour at
all. Changing the default would quietly repaint every event that relies on it.

The calendar's buttons take the page surface as their text colour, so they read
as white on graphite in light mode and as dark on light grey at night.

The red line marking the current time is `--alert`, the same red that marks
anything due soon on every other page.

---

## Data flow

```
  click or drag
       |
       v
  schedule-view.tsx        finds the event in the expanded list
       |
       v
  saveOccurrence / removeOccurrence      <- snapshot taken here for undo
       |
       v
  event-store.ts           optimistic cache update, then emit()
       |                                        |
       |                                        v
       |                              useSyncExternalStore re-renders
       v
  Supabase                 write, errors surfaced not swallowed
```

Reading back is the same path in reverse: `loadEvents()` fetches the profile
row, then every event, maps rows to `LifeEvent`, and `expand()` turns the series
heads into blocks for whatever range the calendar is showing.

### Why `useSyncExternalStore` and not `useState`

The obvious version, `useState` plus a `useEffect` that reads on mount, **fails
lint**. `react-hooks/set-state-in-effect` rejects calling setState synchronously
inside an effect. `useSyncExternalStore` is the supported answer:
`getServerSnapshot` returns a stable empty array so the server render and the
hydration agree, then the client swaps in real data. `getSnapshot` has to return
the same array reference until a write replaces it, which is why the store
caches.

### Why writes used to disappear

Events appeared on screen and were gone after a reload. Three causes stacked:

1. The store called `insert` and ignored the result, so a rejected write looked
   identical to a successful one.
2. Hot reload resets module state, clearing `userId`, while the mount effect
   does not run again. Writes then went out with an empty owner and Row Level
   Security refused them.
3. The row trusted `userId` from the form rather than the session.

All three are fixed: every write is checked and shows a banner on failure,
`ensureLoaded()` runs before any write, and `toRow` stamps the owner from the
session.

---

## Undo

One step, bound to Ctrl+Z and Cmd+Z, ignored while the cursor is in an input.

Before each save or delete the store keeps a reference to the current array.
Undo diffs that snapshot against the present: rows missing now are reinserted,
rows added are deleted, rows that differ are updated. Because it works on whole
lists it is automatically correct for "delete all events", which removes many
rows at once.

The cache array is never mutated in place, every operation builds a new one, so
keeping the snapshot costs one reference and no copying.

---

## Where the other modules attach

```
  events
    |
    +--  type = work     ->  Finance    built: hours x wage + tips, as income
    +--  type = dining   ->  Finance    built: the amount, as spending
    +--  type = class    ->  Academic   not wired, entered by hand
    +--  type = gym      ->  Fitness    not built yet: workout and calories
```

**Finance reads work shifts and meals straight from the calendar** and stores
nothing of its own for them. Editing or deleting one from the Finance page
writes to the event, through the calendar's own `saveOccurrence` and
`removeOccurrence`, so a repeating shift asks the same Apply to question there
as here. `finance.md` has the details; `apps/web/lib/from-schedule.ts` is the
code.

**Academic and the calendar do not talk to each other**, at the user's request
since 2026-09-26. An exam is written down in both places. `ClassEvent` still
carries an optional `courseId`, unused, so relinking later needs no change to
the contract. The `exam` event type was removed the same week; an old exam row
still in the database simply shows as a general event.

**Fitness is not built.** Gym events already carry `workout` and `calories`,
which is what it will start from. See `fitness.md`.

The open question in `CLAUDE.md` section 9, whether Money should store rows or
derive them, was answered for shifts and meals by deriving. It stays open for
anything else.

---

## Tests

```
pnpm test        606 unit tests for the whole app, 176 of them here
pnpm e2e         78 end to end tests for the whole app, 32 of them here
```

Unit tests are in `apps/web/modules/schedule/tests`, mirroring `lib/` and
`components/`. End to end specs are in `tests/e2e/schedule`: the calendar view,
creating and editing in the form, and dragging. Neither touches the
real Supabase project: the unit suite swaps in an in memory client, and the end
to end suite seeds a session into `localStorage` and intercepts every REST call.
`CLAUDE.md` section 8e has the details, including why the test server builds into
`.next-e2e`.

Anything below in Traps has a test named after it. Break one on purpose and the
suite should go red; if it does not, the test is decorative and should be fixed.

---
## Traps

**All five FullCalendar packages must share one major version.** Installing
`@fullcalendar/react@7` next to plugins at `6.1.21` put two copies of
`@fullcalendar/core` in the lockfile. Plugins register into the core they were
built against, so the React adapter saw none of them. The plugins have no v7
release, so the whole set stays on `^6.1.21`.

**The calendar's stylesheet stays loaded after you leave the page.** Next does
not remove a page's CSS on navigation, which is why every rule in
`schedule.css` that touches the page layout or the colours is written against
`data-page="schedule"`. A rule without it would reach the next page you open.

**A line inside the grid stops short of the right edge on Windows.** The inner
tables leave room for a scrollbar, and on a computer that shows scrollbars that
room is about 15 pixels. Draw a full width line on an outer cell, never on an
inner one. The test browser has invisible scrollbars, so this never shows up in
a screenshot.

**FullCalendar adds its own CSS when the page loads**, so searching the code
for a colour will not find its defaults. The pale cyan it shows while you drag
out a new event is one of them. Check what is actually on screen in the
browser, not only what is in the files.

**A native `select` fires no change event when you pick the value it already
shows.** The Custom entry therefore needs its own separate option, otherwise
reopening the panel is impossible.

**Colour is checked, never eyeballed.** Every pair in the palette passes WCAG AA
at 4.5:1. Two failures were caught by computing first: white at 80 percent on
the accent colour came to 4.42, and the today badge was invisible at 1.07
against the surface.
