import { describe, expect, it, vi } from "vitest";
import type {
  Course,
  GradeItem,
  LifeEvent,
  Semester,
} from "@lifeos/contracts";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

const { deadlines, eventsOn } = await import("@/lib/for-dashboard");

const TODAY = "2026-03-10";

let seq = 0;

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 2, day, hour, minute).toISOString();
}

function event(over: Partial<LifeEvent> = {}): LifeEvent {
  seq += 1;
  return {
    id: `e-${seq}`,
    userId: "u1",
    type: "general",
    title: `Event ${seq}`,
    start: at(10, 9),
    end: at(10, 10),
    ...over,
  } as LifeEvent;
}

function semester(over: Partial<Semester> = {}): Semester {
  return {
    id: "now",
    userId: "u1",
    name: "Spring 2026",
    startsOn: "2026-01-12",
    ...over,
  };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: "c1",
    userId: "u1",
    semesterId: "now",
    title: "Data Structures",
    code: "CS 201",
    scale: [],
    ...over,
  };
}

function item(over: Partial<GradeItem> = {}): GradeItem {
  seq += 1;
  return {
    id: `i-${seq}`,
    userId: "u1",
    courseId: "c1",
    categoryId: "hw",
    title: `Item ${seq}`,
    score: null,
    maxScore: 100,
    dueOn: "2026-03-12",
    ...over,
  };
}

function titles(events: LifeEvent[]): string[] {
  return events.map((one) => one.title);
}

describe("what is on the calendar today", () => {
  it("keeps the events that fall today and drops the rest", () => {
    const shown = eventsOn(
      [
        event({ title: "Today", start: at(10, 9), end: at(10, 10) }),
        event({ title: "Yesterday", start: at(9, 9), end: at(9, 10) }),
        event({ title: "Tomorrow", start: at(11, 9), end: at(11, 10) }),
      ],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Today"]);
  });

  it("keeps an event that runs over midnight into today", () => {
    const shown = eventsOn(
      [event({ title: "Night shift", start: at(9, 22), end: at(10, 2) })],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Night shift"]);
  });

  it("leaves out an event that ends exactly at midnight", () => {
    const shown = eventsOn(
      [event({ title: "Late", start: at(9, 23), end: at(10, 0) })],
      TODAY,
    );
    expect(shown).toEqual([]);
  });

  it("reads an all day end as the day after the last day", () => {
    const shown = eventsOn(
      [
        event({
          title: "Trip",
          allDay: true,
          start: "2026-03-08",
          end: "2026-03-11",
        }),
        event({
          title: "Over",
          allDay: true,
          start: "2026-03-09",
          end: "2026-03-10",
        }),
      ],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Trip"]);
  });

  it("shows today's occurrence of a repeating event", () => {
    const shown = eventsOn(
      [
        event({
          id: "s1",
          seriesId: "s1",
          title: "Standup",
          recurrence: { freq: "daily", interval: 1 },
          start: at(2, 9),
          end: at(2, 9, 15),
        }),
      ],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Standup"]);
    expect(new Date(shown[0].start).getDate()).toBe(10);
  });

  it("puts all day events first, then the rest by start time", () => {
    const shown = eventsOn(
      [
        event({ title: "Afternoon", start: at(10, 15), end: at(10, 16) }),
        event({ title: "Morning", start: at(10, 8), end: at(10, 9) }),
        event({
          title: "Birthday",
          allDay: true,
          start: "2026-03-10",
          end: "2026-03-11",
        }),
      ],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Birthday", "Morning", "Afternoon"]);
  });

  it("keeps all day events above one that started before today", () => {
    const shown = eventsOn(
      [
        event({ title: "Long shift", start: at(8, 22), end: at(10, 1) }),
        event({
          title: "Holiday",
          allDay: true,
          start: "2026-03-10",
          end: "2026-03-11",
        }),
      ],
      TODAY,
    );
    expect(titles(shown)).toEqual(["Holiday", "Long shift"]);
  });
});

describe("what is due", () => {
  it("lists unmarked work with a due date, late work first", () => {
    const due = deadlines(
      {
        semesters: [semester()],
        courses: [course()],
        items: [
          item({ title: "Next week", dueOn: "2026-03-17" }),
          item({ title: "Late", dueOn: "2026-03-06" }),
          item({ title: "Soon", dueOn: "2026-03-12" }),
        ],
      },
      TODAY,
    );
    expect(due.map((one) => one.item.title)).toEqual([
      "Late",
      "Soon",
      "Next week",
    ]);
    expect(due.map((one) => one.days)).toEqual([-4, 2, 7]);
  });

  it("leaves out marked work and work with no due date", () => {
    const due = deadlines(
      {
        semesters: [semester()],
        courses: [course()],
        items: [
          item({ title: "Marked", score: 0 }),
          item({ title: "Undated", dueOn: undefined }),
          item({ title: "Open" }),
        ],
      },
      TODAY,
    );
    expect(due.map((one) => one.item.title)).toEqual(["Open"]);
  });

  it("covers every course in the current semester", () => {
    const due = deadlines(
      {
        semesters: [semester()],
        courses: [course(), course({ id: "c2", code: "MATH 221" })],
        items: [
          item({ title: "Algorithms", courseId: "c1" }),
          item({ title: "Matrices", courseId: "c2" }),
        ],
      },
      TODAY,
    );
    expect(due.map((one) => one.course.code)).toEqual(["CS 201", "MATH 221"]);
  });

  it("ignores courses from other semesters", () => {
    const due = deadlines(
      {
        semesters: [
          semester(),
          semester({ id: "past", startsOn: "2025-08-20" }),
          semester({ id: "next", startsOn: "2026-08-20" }),
        ],
        courses: [
          course(),
          course({ id: "old", semesterId: "past" }),
          course({ id: "new", semesterId: "next" }),
        ],
        items: [
          item({ title: "This term" }),
          item({ title: "Forgotten", courseId: "old", dueOn: "2025-10-01" }),
          item({ title: "Ahead", courseId: "new", dueOn: "2026-09-01" }),
        ],
      },
      TODAY,
    );
    expect(due.map((one) => one.item.title)).toEqual(["This term"]);
  });
});
