# Dashboard

The home page at `/`. It is meant to answer one question when you open LifeOS:
what does today look like. Four panels each give a short read of one page and
link to it: today's events, the work that is due or late, this month's income.
Fitness is not built yet, so its panel only says what will live there.

Written 2026-10-10, wired to data 2026-10-31.

---

## What is on it

```
  Saturday
  October 10

  +----------------------------+  +----------------------------+
  | Today                      |  | Academic                   |
  | All day   Birthday         |  | Oct 29  Essay  2 days late |
  | 9:00 AM   Morning gym      |  | Nov 1   Quiz 2   tomorrow  |
  | 2:00 PM   Lecture          |  | Nov 6   HW 4    in 6 days  |
  | Open Schedule              |  | Open Academic              |
  +----------------------------+  +----------------------------+
  +----------------------------+  +----------------------------+
  | Finance                    |  | Fitness                    |
  | Income in October 2026     |  | Your workouts will show    |
  | $2,197.00                  |  | here.                      |
  | Cafe shift  Oct 31  $97.00 |  |                            |
  | Open Finance               |  | Open Fitness               |
  +----------------------------+  +----------------------------+
```

**The date is the headline.** The weekday sits small above the month and day,
which are set large and heavy. It is the one thing on the page that is always
true and always useful.

**Four equal panels in a two by two grid**, in the same order as the top bar:
Today, Academic, Finance, Fitness. The first version gave Today a wide column
and had three panels; a fourth was added so the page reads even. **This month**,
which used to show income, tax and spending, was taken out, and the Finance
panel took its place, meant for the current month's income.

Each panel has the same minimum height and keeps its link at the bottom, so the
four line up. On a phone they stack in the same order.

**Each panel wears the colour of the page it opens**, in light mode: Today is
graphite, Academic blue, Finance honey gold, Fitness orange, on the mint page.
A panel carries `data-tone="<page>"`, and each page file lists
`:root:not([data-theme="night"]) [data-tone="<page>"]` beside its own light
block, so the colours come from one place. That is why `app/page.tsx` imports
all four page stylesheets. At night every panel takes the Dashboard's dark
surfaces but keeps its page's night accent on the icon and the link, from a
`:root[data-theme="night"] [data-tone="<page>"]` rule in each page file, so the
four still read apart.

**The page name sits in the top right of each panel as a small link**, and the
whole panel is a link to that page through the link's `::after` stretched over
it. On a phone the name hides and only the arrow shows, because the title and
the name did not fit on one row at 390px.

**Under the date runs one line of chips**: how many events today, how many
assignments are late (in red) or due within three days, and the next charge if
it falls within a week. Each chip opens its page. `today-summary.tsx`.

### Today

Every event that touches today, repeating ones included: all day events first,
then the rest by start time, each as a small block in its own event colour with
the start and end time beside it. An event that started last night and runs
past midnight counts, one that ends exactly at midnight does not.

It reads as a timeline. A red **Now** line sits after everything that has
started; finished events turn into an outline in muted ink and are struck
through; the one in progress carries a **Now** tag; the next one says how far
off it is ("in 48 min"). When the list is over five, finished events are the
first to go. The order and the cutting live in
`modules/dashboard/lib/timeline.ts`, with tests beside it. The clock ticks
through a minute snapshot in `lib/today.ts`, so the line moves on its own.

### Academic

Every item **with a due date and no score yet** across all the courses of the
current semester, which is the one Academic opens on by default: the most
recent semester that has started. Late work is included and comes first,
because the list runs by due date. Each row shows the date, the item, the
course code with its colour dot, and how far off it is, in red from three days
out and once it is late. Older semesters are left out on purpose, so a score
never entered last year does not sit here as late forever.

### Finance

This month's income total, large, in the income green. It is the same sum the
Finance page shows: typed income plus the pay for every work shift on the
calendar, including income dated later in the month, since Finance does not
split income at today either. Where it came from is left to the Finance page.

Under it, **the next three charges**: expenses and planned meals dated after
today, looking through the end of next month so the last days of a month are
not empty. `upcomingCharges` in `lib/for-dashboard.ts`.

### Fitness

Unchanged: it says what will live there and links to the page.

**Each list shows five rows at most**, then "and N more"; the page behind it
has the rest. With nothing to show, a panel says so in one line.

---

## The date

`modules/dashboard/components/today-heading.tsx` draws it in the browser, not
on the server. The page is static, so a server rendered date would be frozen at
the moment the site was built, and the server's time zone is not yours either.

It reads the date through `useSyncExternalStore` and checks again every minute,
so a tab left open past midnight moves on to the next day by itself. The server
renders an empty heading of the same height, so nothing jumps when the date
appears.

---

## Colour

Mint, chosen so the page belongs to nobody in particular: LifeOS is shared, and
blue or pink would lean one way.

The colours live in `app/dashboard.css`, and only there. The sign in screen
uses the same palette: `dashboard.css` lists `data-page="login"` beside the
Dashboard.

```
light  canvas #cdebdc   surface #dcf2e6   surface-muted #c3e5d4
       line #a9d9c1     line-strong #7cc6a3   accent-soft #aee6cb
       ink #10201a      ink-muted #34503f     ink-faint #3e5a4b
       accent #05664b
night  canvas #0d1613   surface #14201b   surface-muted #1c2b24
       line #27392f     line-strong #3a5246   accent-soft #133427
       ink #ecf8f2      ink-muted #a6c4b6     ink-faint #8cae9e
       accent #5ee8b4
```

**Nothing is pure white.** The first version had white cards and a white top
bar on a mint page, which was glaring. The light palette was taken down a step
so the brightest surface is about 94 percent of white, with the cards still one
step lighter than the page so they lift. The other four pages were then given
the same treatment, built from this palette; see `structure.md`.

**The brightness is in the large areas, the text stays dark enough to read.**
The mint shows in the page, the panels, the nav pill and the borders. Links and
the brand mark use a deeper mint, because a bright mint cannot be read as text.
At night the bright mint is used directly, since there it is light text on a
dark surface.

The tab icon is `app/icon.svg`, a white L on `#05664b`.

---

## Files

```
app/page.tsx                                      the page and the four panels;
                                                  imports every page's CSS for the panel colours
app/dashboard.css                                 its colours
app/icon.svg                                      its tab icon
modules/dashboard/components/panel.tsx            the panel shell, and the five row cap
modules/dashboard/components/today-heading.tsx    the date
modules/dashboard/components/today-events.tsx     the Today list
modules/dashboard/components/deadlines.tsx        the Academic list
modules/dashboard/components/month-income.tsx     the Finance total and list
modules/dashboard/lib/today.ts                    today's date as a store, ticking every minute
lib/for-dashboard.ts                              the bridge to the other three modules
tests/lib/for-dashboard.test.ts                   what counts as today and as due
tests/e2e/dashboard/dashboard.spec.ts             the three panels against seeded data
```

The four panels are written out in `app/page.tsx`, each a `Panel` with its
content inside. Adding or reordering a panel is an edit there.

---

## Where the data comes from

No new table. The Dashboard reads the stores the other pages already load, so
opening it and then a page costs nothing extra, and the stay fresh refresh on
tab focus covers it too.

A module may not import another module, so `modules/dashboard` reaches the
other three through `lib/for-dashboard.ts`, a bridge beside `from-schedule.ts`.
It re-exports what each store offers (`subscribe`, the snapshots,
`ensureLoaded`) and holds the two pieces of logic only the Dashboard needs:

| Function | What it decides |
| --- | --- |
| `eventsOn(events, day)` | the events that touch a day, expanded from their repeat rules, sorted |
| `deadlines(academic, day)` | unmarked, dated items in the current semester's courses, by due date |

The income comes from `incomeIn` in `lib/from-schedule.ts`, which the Finance
page now uses as well, so the two figures cannot drift apart. The "in 3 days",
"2 days late" wording is `dueLabel` in `lib/dates.ts`, moved up from Academic's
Coming up so both say it the same way.
