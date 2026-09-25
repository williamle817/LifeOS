# Calendar

Schedule is the heart of LifeOS. Money, Academic and Fitness will all derive
their numbers from `events`, so the shape of that one table decides the rest of
the project. Read this before changing anything under `apps/web/components` or
`apps/web/lib`.

Written 2026-09-25, end of the Supabase work.

---

## Layers

Each layer talks only to the one below it, so replacing one does not drag the
other three along.

```
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
| `type` | text | general, work, gym, dining, class, exam |
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
never from `start.toISOString()`.

Also note FullCalendar treats an all day `end` as **exclusive**. A one day event
on 24 September stores `end_at` as `2026-09-25`. The form subtracts a day when
it loads and adds it back on save, so the user sees the day it happens.

**`data` is jsonb, not a column per field.** Each type carries its own fields:
work has `tips`, gym has `workout` and `calories`, dining has `place` and
`amount`, class has `course`, exam has `course`, `score` and `maxScore`. One
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

`recurrence.ts` exports `expand(rows, from, to)`. It walks each series head and
emits occurrences inside the window, consulting a map of overrides and
cancellations keyed by `seriesId::date`.

The first version stepped from the series start one occurrence at a time behind
a 2000 iteration guard. Weekly from 2026 to 2126 is 5200 steps, so the guard cut
off around 2064 and scrolling far ahead showed **nothing at all**. `seek()` now
jumps straight to the first occurrence at or after the window, using arithmetic
rather than iteration, and the loop only ever runs inside the visible range.

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

Nothing below exists yet. It is written down so the calendar is not changed in a
way that blocks it.

```
  events
    |
    +--  type = work     ->  Money      hours from start/end, tips from data
    +--  type = dining   ->  Money      amount from data
    +--  type = exam     ->  Academic   score and maxScore from data
    +--  type = class    ->  Academic   course link
    +--  type = gym      ->  Fitness    workout, calories from data
```

Two open questions, both recorded in `CLAUDE.md` section 9 and both due at
Phase 6:

**Does Money store transaction rows or derive at read time?** The frozen MVP in
`mvp/` derived everything from the event list and its README reports no sync
bugs, because there was nothing to keep in sync. The roadmap leans the other
way. Settle it deliberately.

**Does `course` stay free text?** Class and Exam carry a plain string today
because Academic does not exist until Phase 7. That phase swaps it for a
`courseId`, one field on one table.

---

## Traps

**All five FullCalendar packages must share one major version.** Installing
`@fullcalendar/react@7` next to plugins at `6.1.21` put two copies of
`@fullcalendar/core` in the lockfile. Plugins register into the core they were
built against, so the React adapter saw none of them. The plugins have no v7
release, so the whole set stays on `^6.1.21`.

**Two heights in `globals.css` are tied to the top bar.** `--bar-h` and
`--toolbar-h` position the sticky day header and the scroll offset that lands on
8 AM. FullCalendar writes its own `top` inline, which is why the override needs
`!important`.

**A native `select` fires no change event when you pick the value it already
shows.** The Custom entry therefore needs its own separate option, otherwise
reopening the panel is impossible.

**Colour is checked, never eyeballed.** Every pair in the palette passes WCAG AA
at 4.5:1. Two failures were caught by computing first: white at 80 percent on
the accent colour came to 4.42, and the today badge was invisible at 1.07
against the surface.
