# Finance

One page at `/finance`, one month at a time. A ring across the top splits the
month into money in against money out, a strip under it warns about what is
still to come, and two lists hold the entries themselves.

Written 2026-09-27, at the end of the Finance frontend. Last updated 2026-10-10.

---

## Layers

```
  UI            finance-view.tsx      the page, and the month it is showing
                month-bar.tsx         prev, next, back to this month
                split-chart.tsx       the ring and the three figures
                coming-up.tsx         what has not gone out yet
                flow-panel.tsx        one side of the page, used twice
                      |
  MONTH MATHS   month.ts              one row  ->  where it lands each month
                      |
  STORE         flow-store.ts         read, write, the three scopes
                      |
  CONTRACT      packages/contracts    Flow, the two type lists
                      |
  DATABASE      Supabase Postgres     users + flows
```

`flow-store.ts` is the only file that knows the database exists, the same rule
Schedule follows. Shared pieces come from `apps/web/components`: the pencil and
bin icons, the modal shell and the Apply to panel. Nothing in `modules/finance`
imports from another module; the calendar is reached only through
`apps/web/lib/from-schedule.ts`. The route, `app/finance/page.tsx`, imports the
view and `finance.css`. `structure.md` shows how it all connects.

---

## Database

### Creating the table

Run the whole block in the Supabase SQL editor. Do not use the editor's
"enable RLS" button on its own: RLS with no policies locks you out of your own
rows.

```sql
create table public.flows (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  title text not null,
  place text,
  category text,
  on_date text not null,
  amount numeric not null default 0,
  recur text not null default 'once',
  until_on text,
  skips jsonb not null default '[]'::jsonb,
  event_id uuid references public.events(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.flows enable row level security;

create policy "flows read" on public.flows for select to authenticated
  using (user_id = (select id from public.users where auth_id = auth.uid()));

create policy "flows insert" on public.flows for insert to authenticated
  with check (user_id = (select id from public.users where auth_id = auth.uid()));

create policy "flows update" on public.flows for update to authenticated
  using (user_id = (select id from public.users where auth_id = auth.uid()))
  with check (user_id = (select id from public.users where auth_id = auth.uid()));

create policy "flows delete" on public.flows for delete to authenticated
  using (user_id = (select id from public.users where auth_id = auth.uid()));
```

### If the table already exists

The columns arrived in three rounds while the module was being built. These are
the statements that bring an older table up to date; each one is safe to skip if
the column is already there.

```sql
alter table public.flows add column category text;
alter table public.flows add column until_on text;
alter table public.flows add column skips jsonb not null default '[]'::jsonb;
```

`Could not find the 'category' column of 'flows' in the schema cache` means one
of these has not been run. The store writes every column on every save, so one
missing column breaks every write, not just the ones that use it. If the column
is definitely there and the error persists, PostgREST is holding a stale cache:

```sql
notify pgrst, 'reload schema';
```

### `flows`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key |
| `user_id` | uuid | owner, references `public.users.id` |
| `kind` | text | `income` or `expense` |
| `title` | text | what the row shows |
| `place` | text | where it happened, optional |
| `category` | text | what it was for, optional, may stay null forever |
| `on_date` | text | date only, and for a series the day it starts |
| `amount` | numeric | a plain decimal, never negative |
| `recur` | text | `once`, `monthly` or `yearly` |
| `until_on` | text | last day the series runs, inclusive |
| `skips` | jsonb | dates dropped out of the series |
| `event_id` | uuid | the Schedule event this came from, not wired yet |
| `position` | int | the order rows were entered in, breaks ties on the same date |
| `created_at` | timestamptz | |

Three column names are deliberate.

**`recur`, not `repeat`.** Postgres already has a `repeat()` function and a
column of that name invites trouble.

**`on_date`, not `on`.** `on` is close enough to reserved to be a nuisance.

**`skips` is jsonb, not `text[]`.** It matches how `events.data` is stored and
avoids array quoting through PostgREST.

`user_id` points at `public.users.id`, never at `auth.users`, the same Cognito
safe chain the calendar uses. See `docs/calendar.md` for why.

`event_id` marks a row that came from a Schedule work shift. Nothing writes
one today, because those lines are derived rather than stored; see **Work and
meals come from the calendar** below. The column stays because it is what a
stored row would use if that decision is ever reversed.

---

## One row, many months

A subscription is **one row, not a row per month**. `dateIn` in `month.ts`
answers where a row lands in a given month:

| `recur` | Shows in |
| --- | --- |
| `once` | only its own month |
| `monthly` | every month from its start |
| `yearly` | the month it started in, every year from its start |

Nothing appears before `on_date`. Then two filters run: anything after
`until_on` is gone, and anything listed in `skips` is gone.

**A late day is pulled back to the end of a short month.** Rent on the 31st
lands on 28 February, and on the 31st again in March. The row keeps the 31st,
which is why editing a series and editing one month of it are different things.

Amounts are plain decimals, not integer cents, so `total` rounds to cents at
every step instead of once at the end.

---

## Money that has not gone out yet is not spent

`settled` and `pending` split a month's rows at today.

- The **Expenses list**, the **ring** and the **Expenses total** show only what
  has already gone out.
- Anything still ahead sits in the **Coming up** strip instead.

Without the split, a subscription dated the 28th made the whole month look
overspent from the 1st.

The split follows the month on screen, so a past month is entirely settled and a
month still ahead is entirely pending. Coming up renders nothing at all when
nothing is due, so an empty month has no empty box in the middle of the page.
Anything due within three days is marked in red.

**Income is not split.** Money expected later in the month still counts toward
the Income total, which means Left over is optimistic until the month is over.
That was asked for on the expense side only; it is a decision, not an oversight.

---

## Editing and deleting a series

A monthly or yearly entry raises the same **Apply to** panel the calendar
raises, with the same three choices. A one off entry never raises it.

Finance has no per occurrence rows, so the three scopes are built out of
`until_on` and `skips`:

| Scope | Delete | Edit |
| --- | --- | --- |
| This entry | add the date to `skips` | add to `skips`, insert a `once` row |
| This and following | `until_on` = the day before | cut the old row, insert a new series |
| All entries | drop the row | write the values onto the row |

Three rules that are easy to get wrong:

**Editing all keeps the month the series started in** and takes only the day of
month from the form. Anchoring the series at the occurrence being edited would
erase every earlier month.

**Editing all carries `skips`, `until_on` and `position` across by hand.**
Forget them and a saved edit silently resurrects occurrences that were deleted.

**Following, applied to the very first occurrence, deletes the row** rather than
leaving `until_on` earlier than `on_date`, which would be a row nobody could
ever see or reach again.

When you edit a repeating entry the Date field shows **the day that occurrence
landed on**, not the day the series began, which is how the calendar behaves.

---

## Work and meals come from the calendar

Finance does not ask you to type the same thing twice. Every month it reads two
kinds of event out of Schedule: **work** becomes a line of income, **dining**
becomes a line of spending.

### Work

| From the event | Becomes |
| --- | --- |
| title | the name |
| `place` | the location |
| the day it starts | the date |
| hours x `wage` + `tips` | the amount |

Hours are read off `start` and `end`, never stored, which is the rule the event
contract set in the first place. A repeating shift is expanded first, so a
weekly job gives four or five lines in a month, each one paid separately.

**Tips are optional.** A shift with no tips pays its wage and nothing more; a
shift with neither a wage nor tips shows as $0.00 rather than being hidden, so
a forgotten wage is visible instead of quietly missing from the month.

An **all day** work event contributes no hours, so it pays its tips and nothing
else. There is no sensible number of hours to read off a date with no clock on
it, and guessing 24 would be worse than guessing zero.

Every shift is filed under the type **Work**.

### Meals

| From the event | Becomes |
| --- | --- |
| title | the name |
| `place` | the location |
| the day it starts | the date |
| `amount` | the amount |

A meal with **no price entered yet shows as $0.00**, which is the normal state
of a dinner you have not eaten or not paid for. Fill the price in later and the
month updates. Meals are filed under **Dining out**, and they are expenses, so
a meal still ahead of today sits in Coming up rather than in the spent total.

### These lines are derived, not copied

Nothing is written to `flows`. The event is the only copy, so there is no
second row to keep in step, nothing to orphan when a shift is deleted, and no
duplicate when the same month is opened twice. It is the approach the frozen
MVP used and the one `docs/calendar.md` calls the heart of the system.

### Editing and deleting one of these from here

The pencil and the bin work, and they act on the calendar event rather than on
anything in `flows`.

**A shift opens its name and location only.** The amount cannot be edited here
because it is `hours x wage + tips`, and a changed number gives no way to tell
which of the three was meant. Change the wage, the tips or the time on the
calendar.

**A meal opens its name, location and price**, because a meal's amount is one
field on the event with nothing to disentangle. That is the field you come back
and fill in after dinner.

Date and repeat are missing on both, because they belong to the event and the
calendar already edits them properly.

**A repeating one raises the same Apply to panel** an entry does, and it means
the same three things, because underneath it calls the calendar's own
`saveOccurrence` and `removeOccurrence`. Somebody who works 8 to 5 every day
sets that up once as a daily event, so deleting "just today's" has to be
possible from this page.

### Where the wiring lives

`apps/web/lib/from-schedule.ts`, above both modules, which is the rule section
8e2 of CLAUDE.md sets: neither module imports the other. It was called
`shifts.ts` until meals arrived and its job widened. It also re-exports the
event store's `subscribe`, `getSnapshot` and `ensureLoaded` so
`finance-view.tsx` never reaches into `modules/schedule` itself. The cost of
that is that any test touching `from-schedule.ts` pulls in Supabase and has to
mock it.

`Flow.eventId` is what marks a derived row, and it is the same column a stored
row would use if this is ever flipped to written rows.

---

## Order

Rows sort by the date they land on, **latest first**, so the newest thing that
happened is at the top of each list. Two entries on the same day fall back to
the order they were entered in.

**There is no hand ordering here**, and no drag handle on any row. A date is
the only thing that decides where a line sits. Half the lines come from the
calendar and have no row of their own to remember a hand order in, so offering
the handle on the other half would only have made the two look different.
Academic is the module where the order is yours; this one is a record of when
things happened.

Coming up runs the other way, soonest first, because it is a list of what is
about to happen rather than a record of what did.

That is the opposite trade from Academic, where the hand order wins outright.
Here the date is the point of the list. If a pure hand order is ever wanted, the
sort in `inMonth` is the one line to change.

---

## Types

`category` is what an entry was for, picked from a list that depends on the
side:

- **Expenses**: Groceries, Dining out, Going out, Subscription, Transport,
  Housing, Health, Shopping, Other
- **Income**: Work, Paycheck, Tips, Side job, Gift, Refund, Other

Both lists start with **Not set** and nothing ever requires a type. The column
is free text, so the lists can grow in `packages/contracts/src/finance.ts`
without a migration. Nothing adds up by type yet.

---

## Colour

The Finance page is **honey gold**: money, and a colour that is neither the
green of income nor the red of spending. Its palette is `app/finance/finance.css`,
one block for light mode and one for night:

```
light  canvas #f2e0c8   surface #f8e9d8   surface-muted #edd8bd
       line #e4c7a1     line-strong #d6ab72   accent-soft #f3d1a6
       ink #231a0f      ink-muted #57452d     ink-faint #614f39
       accent #7f5300
night  canvas #14110a   surface #1e1a10   surface-muted #2a2416
       line #3a3220     line-strong #54482c   accent-soft #3a2e10
       ink #faf5e8      ink-muted #cdbf9c     ink-faint #b3a37d
       accent #f6c453
```

Both blocks are written against `data-page="finance"`, which the root of
`finance-view.tsx` carries. Next keeps a page's stylesheet loaded after you
leave it, so without that condition the gold would follow you to the next page.

**Nothing on the page is pure white.** Every surface is a toned gold, built
from the same lightness steps as the Dashboard's mint so all five pages feel
like one app. The tab icon is `app/finance/icon.svg`, a white L on `#7f5300`.

**Amounts keep their own colours**: `--money-in` green and `--money-out` red,
the same on every page, never retinted by a page palette. On the toned surfaces
they had to go a little deeper to stay readable, so in light mode they are
`#076a39` and `#b02227` now. Each passes 4.5:1 on every background it sits on:
the figure boxes on the page background, the panels, and the Coming up chips.

**Left over and the number inside the ring share one colour**: green above
zero, red below, plain ink at exactly zero. Breaking even is neither good news
nor bad news.

**The Income and Expenses headings carry a coloured dot**, green and red, in
front of the title, on a lightly tinted strip. The total and every amount in the
two lists use figures of equal width, so a column of numbers does not jitter as
the digits change.

The ring keeps the pastel event greens and reds for its two arcs.

---

## Tests

```
apps/web/modules/finance/tests/lib          month, flow-store
apps/web/modules/finance/tests/components   panel, month bar, ring, coming up
apps/web/tests/lib/from-schedule.test.ts    the wiring to Schedule
tests/e2e/finance                           the page end to end
```

126 unit tests in the module and 21 end to end, out of 606 and 78 for the whole
app. The end to end specs cover the month walk, a subscription reappearing,
adding, editing and deleting, filing an entry under a type, the reminder strip,
both scoped writes, the newest date reading first, a work shift arriving from
the calendar and being edited and deleted from here, a repeating shift, a
shift with no tips, and a meal with and without a price.

---

## Traps

**A title appears in both the list and the reminder strip.** A bare
`getByText` in a spec hits two elements; scope it to a `region`.

**A type name matches the `<option>` in the form as well as the row.** Scope to
`getByRole("listitem")` as well.

**A spec that seeds a date relative to today will cross a month boundary near
the end of a month.** Seed relative to a month and page to that month instead.

**`count()` does not retry.** Neither does `allTextContents()`. Await a
`toBeVisible()` on the first match before counting, or a spec reads zero rows
off a page that has not rendered yet.

**A screenshot taken right after switching pages or modes lies.** The nav
pill has `transition-colors`, so a shot inside 150ms catches the old colour mid
fade. Wait, or read the computed colour, before trusting a comparison.

**`ScopeAsk` takes `noun` and `plural`, two props not one.** "entry" does not
pluralise by adding an s, and the first version shipped
*This and following entrys*.
