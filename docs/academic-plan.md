# Academic, plan

Research note written 2026-09-25. Nothing here is built yet. It records the
shape the module should take, the maths it needs, the questions still open, and
the order to build it in.

Read `docs/calendar.md` first. Academic reuses the storage pattern, the popover
pattern and the contract package that Schedule already established.

---

## What the user asked for

1. Add a course with a title, a letter grade scale, and weighted categories.
2. Category names are free text, because one syllabus says Homework and the
   next says Assignments.
3. Each category can drop its lowest N scores, N from 0 upward.
4. Full editing everywhere: fix a score, add an exam score once it comes back,
   change a weight.
5. A class event in Schedule offers a picker of existing courses, plus a custom
   text entry.
6. A chart predicting the chance of A, B, C, D and F.
7. Two live numbers: current grade, and how much of the whole 100 percent has
   been banked so far.

---

## Where the existing code stands

`packages/contracts/src/event.ts` already carries `ClassEvent` with a free text
`course`, and `ExamEvent` with `course`, `score` and `maxScore`. `CLAUDE.md`
section 9 records the decision: free text now, a real `courseId` when Academic
arrives. This is that moment.

The frozen MVP in `mvp/` already built a simpler version of this module, and it
is worth copying from rather than reinventing. `mvp/js/store.js` holds
`courseGrade()`, which is the weighted average over the categories that have
scores, renormalised by the graded weight. `mvp/js/academic.js` holds the course
form with editable category rows and a running weight total that turns green at
exactly 100. What the MVP did not have: drop lowest, a custom letter scale, and
any prediction.

---

## Data model

Four tables, all following the ownership chain already locked in for events:
`user_id` points at `public.users.id`, never at `auth.users`, so the Cognito
swap in Phase 10 stays a two row update.

```
  public.users
       |
       +---- courses          one per class per term
       |        |
       |        +---- categories       Exams 40, Homework 30, ...
       |                  |
       +---- grade_items <-+           every graded thing, one row each
                  |
                  +--- event_id ---> events     optional link to an exam block
```

### `courses`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key |
| `user_id` | uuid | owner |
| `title` | text | Data Structures |
| `code` | text | CS 201, optional |
| `term` | text | Fall 2026 |
| `credits` | numeric | for a later GPA, optional |
| `color` | text | reuse the six event colours |
| `scale` | jsonb | letter cutoffs, see below |
| `created_at` | timestamptz | |

`scale` is an ordered list, highest first:

```json
[{ "letter": "A", "min": 93 }, { "letter": "A-", "min": 90 }, { "letter": "F", "min": 0 }]
```

Stored per course rather than globally, because a course can grade on a curve or
use a different cutoff, and copying the default into each course costs nothing.

### `categories`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key |
| `course_id` | uuid | parent, cascade delete |
| `user_id` | uuid | stamped so one RLS policy fits every table |
| `name` | text | free text, this is the custom naming requirement |
| `weight` | numeric | percent of the final grade |
| `drop_lowest` | int | 0 means keep everything |
| `position` | int | display order |

### `grade_items`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | primary key |
| `course_id` | uuid | denormalised so a course query needs no join |
| `category_id` | uuid | which bucket it counts in |
| `user_id` | uuid | owner |
| `title` | text | HW 3, Midterm |
| `score` | numeric | **null means not graded yet** |
| `max_score` | numeric | points possible |
| `due_on` | text | date only string, same shape rule as the calendar |
| `event_id` | uuid | set when an exam block on the calendar created it |

**One decision to make deliberately.** Today an exam's score lives on the event.
The proposal here is that `grade_items` becomes the only place a score lives,
and an exam event holds nothing but a link. The event owns *when*, the item owns
*how many points*. The reason is that homework, quizzes and participation have
no scheduled time and need this table anyway, and drop lowest has to operate
over one uniform list. The MVP kept two shapes and had to union them at read
time. Question 9 below asks whether to migrate the existing `ExamEvent` fields.

Row Level Security goes on all three tables with the same policy shape as
`events`. The client is never trusted.

---

## The maths

All of it belongs in `apps/web/lib/grade.ts` as pure functions taking plain data
and returning plain data. Locked architecture decision 3 says tests travel with
the logic, so this file gets unit tests the day it is written. That means
installing Vitest, which the repo does not have yet.

### A category's percentage

```
  items graded in the category        score is not null
  sort by score / max_score ascending
  drop the first drop_lowest of them  never dropping the last remaining one
  pct = sum(score) / sum(max_score)   null when nothing is left
```

Dropping by ratio is the obvious reading and is what most syllabi mean. It is
not the same as dropping the item that hurts the grade most, which would be the
one with the worst ratio weighted by its points possible. Question 4.

### The two numbers the user asked for

Let `w` be a category's weight and `p` its percentage.

```
  banked        = sum(p * w) over graded categories        points out of 100
  gradedWeight  = sum(w)     over graded categories
  totalWeight   = sum(w)     over all categories

  current grade = banked / gradedWeight * 100
  current pct   = banked / totalWeight * 100
```

**Current grade** answers "how am I doing in what has been marked", which is the
number every LMS shows, and it does not sink because the final exam has not
happened. **Current pct** answers "how much of the whole course have I already
locked in", and it climbs from 0 toward the final grade. The difference
`totalWeight` minus `gradedWeight` is the honest third number: how much of the
course is still unmarked.

### The partial category problem

A category counts as graded the moment one item in it has a score. Homework
worth 30 percent with three of ten assignments marked still contributes its full
30 to `gradedWeight`. That is what the MVP did and what most LMS systems do, and
it is a lie of the useful kind.

Doing better requires knowing the items that have not happened yet, which is
only possible if the user enters the whole syllabus up front. That single fact
also decides whether prediction can work at all, so it is question 1.

---

## Prediction

Two different products often confused with each other. Build them in this order.

### A. What do I need, deterministic

For each letter with cutoff `m`:

```
  needed = (m - banked) / remainingWeight * 100
```

Output one row per letter: "87 percent average on everything left keeps the A."
Mark a letter impossible when `needed` is above 100 and already secured when it
is at or below 0. No statistics, no assumptions, and it is the number a student
actually acts on.

### B. What are my chances, Monte Carlo

Model each remaining item as a random percentage, then simulate.

```
  for each of 10,000 trials
      for each ungraded item
          draw a percentage from that category's history
          mean   = the category's current percentage
          spread = the category's sample deviation, floored at about 6 points
          clamp into 0..100
      compute the final grade from graded plus drawn
      bucket it into a letter
  probability of a letter = its bucket count / 10,000
```

Render as pastel bars, one per letter. Feed the simulation an injected random
number generator so a seeded run is reproducible and the whole thing stays unit
testable.

Honest limits worth printing under the chart: it assumes future work resembles
past work, it cannot know the final is harder, and a course with one graded item
has almost no history to fit. With no graded items at all the chart should
refuse to draw rather than invent a spread.

### Charting

The project has no chart library. A bar chart of five values needs about forty
lines of inline SVG, which respects the minimum code rule, keeps the pastel
tokens, and avoids a dependency that only one screen uses. Revisit when the
Phase 9 dashboard wants something real.

---

## Calendar integration

### Class events

Replace the free text `course` field with a select listing the user's courses
plus a `Custom...` entry that reveals a text input. The Repeat control in
`event-form.tsx` already solves exactly this interaction, including the trap that
a native select fires no change event when you pick the value it already shows,
so copy that shape rather than inventing a second one.

Stored as `courseId` when picked from the list, as plain `course` text when
typed by hand. Keeping both means a course deleted later leaves a readable label
behind instead of a dangling id.

### Exam events

Same picker, plus a category select and a points possible field. Saving creates
a linked `grade_items` row with `score` null, so the exam appears in Academic as
pending the moment it is scheduled, and the score can be filled in later from
either side.

Two edges to settle, questions 8 and 10: what a repeating exam event should
create, and what deleting an event should do to its item.

---

## Build order

Each stage ends with something usable, following the roadmap rule that no phase
exists only to prepare another.

### Stage 1, courses exist

* `packages/contracts`: `Course`, `Category`, `GradeScale`, default scale
* Supabase: `courses` and `categories` tables, RLS, cascade delete
* `lib/course-store.ts`, the same external store shape as `event-store.ts`
* Academic page: course list, create and edit form with category rows (name,
  weight, drop lowest), a running weight total, a letter scale editor
* Delete course behind a confirm

Usable outcome: every class is written down with how it is graded.

### Stage 2, the grade is live

* `grade_items` table and CRUD, grouped by category
* Vitest installed and wired, plus a `typecheck` script, which `CLAUDE.md`
  section 9 already wants for Phase 14 anyway
* `lib/grade.ts` with drop lowest, category percentage, current grade, current
  pct, letter lookup, all unit tested
* Course card showing the two numbers, the letter, and a category breakdown

Usable outcome: the question "what is my grade right now" is answered.

### Stage 3, Schedule and Academic become one system

* Course picker in the class and exam event forms
* Exam event creates and links a grade item
* Score editable from the event details popover as well as from Academic
* Upcoming exams list on the Academic page

Usable outcome: scheduling an exam and entering its score is one flow.

### Stage 4, prediction

* Needed score table, one row per letter
* Monte Carlo probability bars with a seeded generator, unit tested
* Plain language caveats under the chart

Usable outcome: the chart the user asked for.

### Stage 5, polish

* Group courses by term, filter to the current term
* GPA across courses weighted by credits
* What if mode: type a hypothetical score and watch the grade move
* Export, matching the existing events export

---

## Open questions

Nothing above is settled until these are answered. They are ordered by how much
they change the build.

1. **Do you enter every assignment at the start of term from the syllabus, or
   only add a row once it has a score?** This decides whether current pct is
   honest and whether prediction is possible at all.
2. **Letter scale: plus and minus (A-, B+) or plain A B C D F?** And is there
   one default for every course, or is it set per course?
3. **Must weights total 100?** Block saving, or warn and carry on? Do any of
   your courses grade on total points instead of weights?
4. **Drop lowest: drop by the item's own percentage, or by whichever hurts the
   grade most?** Drop only among items that already have a score, yes?
5. **Extra credit:** does a course ever have an item worth points with nothing
   possible, or a score above the maximum?
6. **Prediction:** chance of each letter, or what you need on the remaining work
   to reach each letter? Or both, and which one first?
7. **Confirm the two numbers.** Current grade is out of what has been marked so
   far. Current pct is out of the whole course. Is that what you meant?
8. **Exam event:** should saving it create the grade item straight away, or only
   once a score is entered? And what should a repeating exam event create?
9. **`ExamEvent` today carries `score` and `maxScore`.** Move them into
   `grade_items` and migrate the existing rows, or leave them where they are?
10. **Deleting:** a course, does it delete its items? an exam event, does it
    delete its linked item or leave it?
11. **Term and GPA:** is term a real field you want to filter by, and do you
    want a GPA across courses?
12. **Screen shape:** one Academic page with a course list and a detail panel,
    the way the MVP did it, or a list page plus a `/academic/[id]` route?
