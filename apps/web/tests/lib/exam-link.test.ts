import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifeEvent } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import {
  resetDb,
  row,
  seed,
  stored,
  storedIn,
  type FakeRow,
} from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

type Wired = {
  events: typeof import("@/modules/schedule/lib/event-store");
  academic: typeof import("@/modules/academic/lib/course-store");
  link: typeof import("@/lib/exam-link");
};

function local(day: string, hour = 9, minute = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

function dayOf(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function courseRow(over: FakeRow = {}): FakeRow {
  return {
    id: "c1",
    user_id: "u1",
    semester_id: "sem-1",
    title: "Data Structures",
    code: "CS 201",
    color: null,
    scale: DEFAULT_SCALE,
    ...over,
  };
}

function categoryRow(over: FakeRow = {}): FakeRow {
  return {
    id: "exams",
    user_id: "u1",
    course_id: "c1",
    name: "Exams",
    weight: 100,
    drop_lowest: 0,
    extra_credit: false,
    position: 0,
    ...over,
  };
}

function examRow(over: FakeRow = {}): FakeRow {
  return row({
    id: "ev-1",
    type: "exam",
    title: "Midterm",
    start_at: local("2026-10-08", 9),
    end_at: local("2026-10-08", 10, 30),
    data: {
      course: "CS 201",
      courseId: "c1",
      categoryId: "exams",
      maxScore: 50,
    },
    ...over,
  });
}

function itemRow(over: FakeRow = {}): FakeRow {
  return {
    id: "item-1",
    user_id: "u1",
    course_id: "c1",
    category_id: "exams",
    title: "Midterm",
    score: null,
    max_score: 50,
    due_on: "2026-10-08",
    event_id: "ev-1",
    ...over,
  };
}

type Seed = {
  events?: FakeRow[];
  courses?: FakeRow[];
  categories?: FakeRow[];
  grade_items?: FakeRow[];
};

async function wire(rows: Seed = {}): Promise<Wired> {
  resetDb(rows.events ?? []);
  seed("semesters", [
    { id: "sem-1", user_id: "u1", name: "Fall 2026", starts_on: "2020-08-20" },
  ]);
  seed("courses", rows.courses ?? [courseRow()]);
  seed("categories", rows.categories ?? [categoryRow()]);
  seed("grade_items", rows.grade_items ?? []);

  vi.resetModules();
  const events = await import("@/modules/schedule/lib/event-store");
  const academic = await import("@/modules/academic/lib/course-store");
  const link = await import("@/lib/exam-link");
  await events.ensureLoaded();
  await academic.ensureLoaded();
  return { events, academic, link };
}

function exam(over: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: "ev-1",
    userId: "u1",
    type: "exam",
    title: "Midterm",
    start: local("2026-10-08", 9),
    end: local("2026-10-08", 10, 30),
    course: "CS 201",
    courseId: "c1",
    categoryId: "exams",
    maxScore: 50,
    ...over,
  } as LifeEvent;
}

function items(): FakeRow[] {
  return stored("grade_items");
}

function linked(): FakeRow | undefined {
  return items().find((item) => item.event_id === "ev-1");
}

beforeEach(() => {
  resetDb();
});

describe("calendar to academic, creating", () => {
  it("creates a grade item when an exam is scheduled", async () => {
    const { events, link } = await wire();
    const event = exam();
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(1);
  });

  it("copies the title, the maximum and the day across", async () => {
    const { events, link } = await wire();
    const event = exam();
    await events.addEvent(event);
    await link.examSaved(event);
    expect(linked()).toMatchObject({
      title: "Midterm",
      max_score: 50,
      due_on: "2026-10-08",
      course_id: "c1",
      category_id: "exams",
      score: null,
    });
  });

  it("never creates an item for an event that is not an exam", async () => {
    const { events, link } = await wire();
    const event = exam({ type: "general" } as Partial<LifeEvent>);
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(0);
  });

  it("creates nothing while the exam has no course chosen", async () => {
    const { events, link } = await wire();
    const event = exam({ courseId: undefined, categoryId: undefined });
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(0);
  });

  it("creates nothing while the exam has a course but no category", async () => {
    const { events, link } = await wire();
    const event = exam({ categoryId: undefined });
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(0);
  });

  it("creates nothing when the course no longer exists", async () => {
    const { events, link } = await wire({ courses: [] });
    const event = exam();
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(0);
  });

  it("creates nothing when the category no longer exists", async () => {
    const { events, link } = await wire({ categories: [] });
    const event = exam();
    await events.addEvent(event);
    await link.examSaved(event);
    expect(items()).toHaveLength(0);
  });
});

describe("calendar to academic, changing", () => {
  it("renames the item when the event is renamed", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.examSaved(exam({ title: "Midterm 1" }));
    expect(linked()?.title).toBe("Midterm 1");
    expect(items()).toHaveLength(1);
  });

  it("follows a change to what the exam is out of", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.examSaved(exam({ maxScore: 80 } as Partial<LifeEvent>));
    expect(linked()?.max_score).toBe(80);
  });

  it("follows the exam to another day", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.examSaved(
      exam({
        start: local("2026-11-20", 14),
        end: local("2026-11-20", 15),
      }),
    );
    expect(linked()?.due_on).toBe("2026-11-20");
  });

  it("moves the item when the exam is pointed at another category", async () => {
    const { link } = await wire({
      events: [examRow()],
      categories: [categoryRow(), categoryRow({ id: "quiz", name: "Quizzes" })],
      grade_items: [itemRow()],
    });
    await link.examSaved(exam({ categoryId: "quiz" } as Partial<LifeEvent>));
    expect(linked()?.category_id).toBe("quiz");
    expect(items()).toHaveLength(1);
  });

  it("keeps a score that was already entered", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow({ score: 44 })],
    });
    await link.examSaved(exam({ title: "Midterm 1" }));
    expect(linked()?.score).toBe(44);
  });

  it("removes the item when the course is cleared off the exam", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.examSaved(exam({ courseId: undefined, categoryId: undefined }));
    expect(items()).toHaveLength(0);
  });

  it("removes the item when the exam is deleted", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.examRemoved("ev-1");
    expect(items()).toHaveLength(0);
  });

  it("does not disturb another exam's item", async () => {
    const { link } = await wire({
      events: [examRow(), examRow({ id: "ev-2" })],
      grade_items: [itemRow(), itemRow({ id: "item-2", event_id: "ev-2" })],
    });
    await link.examRemoved("ev-1");
    expect(items()).toHaveLength(1);
    expect(items()[0].event_id).toBe("ev-2");
  });
});

describe("academic to calendar", () => {
  it("renames the event when the item is renamed", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, title: "Exam 2" });
    expect(storedIn("events", "ev-1")?.title).toBe("Exam 2");
  });

  it("follows a change to what the item is out of", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, maxScore: 75 });
    const data = storedIn("events", "ev-1")?.data as Record<string, unknown>;
    expect(data.maxScore).toBe(75);
  });

  it("moves the event when the due date changes", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, dueOn: "2026-11-20" });
    expect(dayOf(storedIn("events", "ev-1")?.start_at as string)).toBe(
      "2026-11-20",
    );
  });

  it("keeps the time of day when it moves the event", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, dueOn: "2026-11-20" });
    const start = new Date(storedIn("events", "ev-1")?.start_at as string);
    expect(start.getHours()).toBe(9);
  });

  it("keeps how long the exam lasts", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, dueOn: "2026-11-20" });
    const saved = storedIn("events", "ev-1");
    const span =
      new Date(saved?.end_at as string).getTime() -
      new Date(saved?.start_at as string).getTime();
    expect(span).toBe(90 * 60 * 1000);
  });

  it("leaves the event alone when only a score is entered", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const before = { ...storedIn("events", "ev-1") };
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, score: 42 });
    expect(storedIn("events", "ev-1")).toEqual(before);
    expect(linked()?.score).toBe(42);
  });

  it("deletes the event when the item is deleted", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    await link.itemRemoved("item-1");
    expect(stored("events")).toHaveLength(0);
    expect(items()).toHaveLength(0);
  });

  it("touches no event for an item that was typed into Academic", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow({ id: "loose", event_id: null })],
    });
    await link.itemRemoved("loose");
    expect(stored("events")).toHaveLength(1);
  });

  it("copes with an item whose event has already gone", async () => {
    const { academic, link } = await wire({
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await expect(link.itemSaved({ ...item, title: "Exam 2" })).resolves.toBeUndefined();
    expect(items()[0].title).toBe("Exam 2");
  });

  it("moves an all day exam without turning it into a timed one", async () => {
    const { academic, link } = await wire({
      events: [
        examRow({ all_day: true, start_at: "2026-10-08", end_at: "2026-10-09" }),
      ],
      grade_items: [itemRow()],
    });
    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, dueOn: "2026-11-20" });
    expect(storedIn("events", "ev-1")?.start_at).toBe("2026-11-20");
    expect(storedIn("events", "ev-1")?.end_at).toBe("2026-11-21");
  });
});

describe("putting the two back in step", () => {
  it("drops an item whose event has disappeared", async () => {
    const { link } = await wire({ grade_items: [itemRow()] });
    await link.reconcile();
    expect(items()).toHaveLength(0);
  });

  it("rebuilds an item that went missing while the exam stayed", async () => {
    const { link } = await wire({ events: [examRow()] });
    await link.reconcile();
    expect(items()).toHaveLength(1);
    expect(linked()).toMatchObject({ title: "Midterm", max_score: 50 });
  });

  it("brings a stale item back in line with its exam", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow({ title: "Old name", max_score: 10 })],
    });
    await link.reconcile();
    expect(linked()).toMatchObject({ title: "Midterm", max_score: 50 });
    expect(items()).toHaveLength(1);
  });

  it("unpins an exam whose course was deleted", async () => {
    const { link } = await wire({
      events: [examRow()],
      courses: [],
      grade_items: [itemRow()],
    });
    await link.reconcile();
    expect(items()).toHaveLength(0);
    const data = storedIn("events", "ev-1")?.data as Record<string, unknown>;
    expect(data.courseId).toBeUndefined();
    expect(storedIn("events", "ev-1")?.title).toBe("Midterm");
  });

  it("unpins an exam whose category was taken out of the course", async () => {
    const { link } = await wire({
      events: [examRow()],
      categories: [],
      grade_items: [itemRow()],
    });
    await link.reconcile();
    expect(items()).toHaveLength(0);
    const data = storedIn("events", "ev-1")?.data as Record<string, unknown>;
    expect(data.categoryId).toBeUndefined();
  });

  it("keeps the readable course name on an unpinned exam", async () => {
    const { link } = await wire({
      events: [examRow()],
      courses: [],
      grade_items: [itemRow()],
    });
    await link.reconcile();
    const data = storedIn("events", "ev-1")?.data as Record<string, unknown>;
    expect(data.course).toBe("CS 201");
  });

  it("writes nothing when the two already agree", async () => {
    const { link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });
    const before = JSON.stringify([stored("events"), items()]);
    await link.reconcile();
    expect(JSON.stringify([stored("events"), items()])).toBe(before);
  });

  it("leaves an item that never came from the calendar", async () => {
    const { link } = await wire({
      grade_items: [itemRow({ id: "loose", event_id: null })],
    });
    await link.reconcile();
    expect(items()).toHaveLength(1);
  });

  it("leaves events that are not exams alone", async () => {
    const { link } = await wire({
      events: [row({ id: "ev-9", type: "general", title: "Coffee" })],
    });
    await link.reconcile();
    expect(items()).toHaveLength(0);
    expect(storedIn("events", "ev-9")?.title).toBe("Coffee");
  });
});

describe("editing from both sides in turn", () => {
  it("keeps the pair in step whichever side is used", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });

    await link.examSaved(exam({ title: "From calendar" }));
    expect(linked()?.title).toBe("From calendar");

    const item = academic.getSnapshot().items[0];
    await link.itemSaved({ ...item, title: "From academic" });
    expect(storedIn("events", "ev-1")?.title).toBe("From academic");

    await link.reconcile();
    expect(storedIn("events", "ev-1")?.title).toBe("From academic");
    expect(linked()?.title).toBe("From academic");
    expect(items()).toHaveLength(1);
  });

  it("survives a rename on each side without growing a second item", async () => {
    const { academic, link } = await wire({
      events: [examRow()],
      grade_items: [itemRow()],
    });

    for (const name of ["One", "Two", "Three"]) {
      await link.examSaved(exam({ title: name }));
      const item = academic.getSnapshot().items[0];
      await link.itemSaved({ ...item, title: `${name} again` });
    }

    expect(items()).toHaveLength(1);
    expect(stored("events")).toHaveLength(1);
    expect(storedIn("events", "ev-1")?.title).toBe("Three again");
    expect(linked()?.title).toBe("Three again");
  });
});
