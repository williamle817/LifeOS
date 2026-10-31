# Dashboard

The home page at `/`. It is meant to answer one question when you open LifeOS:
what does today look like. For now it is the design only: four panels that say
what they will hold and link to the page that already holds it. Nothing is
wired to data yet, on purpose, so the layout could be settled first.

Written 2026-10-10.

---

## What is on it

```
  Saturday
  October 10

  +----------------------------+  +----------------------------+
  | Today                      |  | Academic                   |
  | Today's events will show   |  | Your courses and grades    |
  | here.                      |  | will show here.            |
  |                            |  |                            |
  | Open Schedule              |  | Open Academic              |
  +----------------------------+  +----------------------------+
  +----------------------------+  +----------------------------+
  | Finance                    |  | Fitness                    |
  | This month's income will   |  | Your workouts will show    |
  | show here.                 |  | here.                      |
  |                            |  |                            |
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
all four page stylesheets. At night every panel takes the Dashboard's night
colours instead.

**The panels say "will show here", not "nothing today".** They are not
connected to anything yet, so saying there is nothing on your calendar would be
a false statement about your calendar.

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
the brand dot use a deeper mint, because a bright mint cannot be read as text.
At night the bright mint is used directly, since there it is light text on a
dark surface.

The tab icon is `app/icon.svg`, a white L on `#05664b`.

---

## Files

```
app/page.tsx                                   the page and the four panels;
                                               imports every page's CSS for the panel colours
app/dashboard.css                              its colours
app/icon.svg                                   its tab icon
modules/dashboard/components/today-heading.tsx the date
```

The panel list is a small array at the top of `app/page.tsx`: title, the line
of text, the page it opens. Adding or reordering a panel is an edit there.

---

## What comes next

Each panel will show real data from the page it links to. None of it needs a
new table, because every module already stores what the Dashboard would show:

| Panel | Would read | From |
| --- | --- | --- |
| Today | the events that fall today | `event-store.ts`, expanded with `recurrence.ts` |
| Academic | the current grade of each course | `course-store.ts` and `grade.ts` |
| Finance | this month's income total | `flow-store.ts` and `lib/from-schedule.ts`, the same sum the Finance page shows |
| Fitness | this week's workouts | nothing yet; Fitness is not built |

The Dashboard would read those stores without importing a module's view, the
same rule every page follows: anything shared moves up to `lib/`.
