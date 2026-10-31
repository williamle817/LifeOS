# Fitness

The page at `/fitness`. It is planned for Phase 8 of the roadmap and is not
built yet: today it shows an empty state that says what will live there, in
its own colour, with its own tab icon.

Written 2026-10-10.

---

## What is there now

An empty state: the Fitness icon, a large heading, a line saying what will
live here, three small chips naming what each session will record (workout
type, duration, calories burned), and a **Log a workout in Schedule** button,
because a workout is entered on the calendar as a gym event today.

That is `components/empty-state.tsx`, the same shared piece any unbuilt page can
use, wrapped in a `div` that carries `data-page="fitness"` so the page's colours
apply.

---

## What it will be built from

The calendar already records workouts. A **gym** event carries:

| Field | Meaning |
| --- | --- |
| `workout` | what the session was, free text, required |
| `calories` | calories burned, optional |
| `start`, `end` | when; the duration is read off these, never stored |

So the duration needs no new field: it is `end` minus `start`, the same rule
Finance uses to work out the hours of a shift.

How Fitness should use those events is **not decided**. Finance reads work
shifts and meals straight out of the calendar at the moment it draws the page
and stores nothing of its own (see `finance.md`). Fitness could do the same with
gym events, or keep a table of its own. That choice belongs to whoever builds
the page, and the open question about it for Money is recorded in
`../CLAUDE.md` section 9.

---

## Colour

Orange, for energy. The colours live in `app/fitness/fitness.css`:

```
light  canvas #fadbd1   surface #fee6de   surface-muted #f6d3c7
       line #f0bfb0     line-strong #e6a089   accent-soft #ffc9b7
       ink #261814      ink-muted #5e4037     ink-faint #674b42
       accent #a23504
night  canvas #16100c   surface #211812   surface-muted #2d211a
       line #3d2c22     line-strong #573f31   accent-soft #40200f
       ink #fbf1ea      ink-muted #d2b6a6     ink-faint #b89a89
       accent #ff8f57
```

The light palette uses the same lightness for each role as the Dashboard's, so
the five pages read as one app in five colours. Its pill, `#ffc9b7`, is the
darkest background of any page, and the fixed red and green were darkened
until they still read on it.

The tab icon is `app/fitness/icon.svg`, a white L on `#a23504`.

---

## Files

```
app/fitness/page.tsx      the page, the empty state inside a data-page wrapper
app/fitness/fitness.css   its colours
app/fitness/icon.svg      its tab icon
```

There is no `modules/fitness/` yet. It gets `components/`, `lib/` and `tests/`
when the page is built; the Vitest globs already include any module folder.
