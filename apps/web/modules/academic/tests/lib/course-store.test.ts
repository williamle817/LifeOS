import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Course, GradeItem, Semester } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import {
  calls,
  failOn,
  resetDb,
  seed,
  stored,
  storedIn,
  type FakeRow,
} from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

type Store = typeof import("@/modules/academic/lib/course-store");

type Seed = {
  semesters?: FakeRow[];
  courses?: FakeRow[];
  categories?: FakeRow[];
  grade_items?: FakeRow[];
};

async function store(rows: Seed = {}): Promise<Store> {
  resetDb();
  seed("semesters", rows.semesters ?? []);
  seed("courses", rows.courses ?? []);
  seed("categories", rows.categories ?? []);
  seed("grade_items", rows.grade_items ?? []);
  vi.resetModules();
  const loaded: Store = await import("@/modules/academic/lib/course-store");
  await loaded.ensureLoaded();
  return loaded;
}

function semesterRow(over: FakeRow = {}): FakeRow {
  return {
    id: "sem-1",
    user_id: "u1",
    name: "Fall 2026",
    starts_on: "2026-08-20",
    ...over,
  };
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
    id: "cat-1",
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

function itemRow(over: FakeRow = {}): FakeRow {
  return {
    id: "item-1",
    user_id: "u1",
    course_id: "c1",
    category_id: "cat-1",
    title: "Midterm",
    score: null,
    max_score: 100,
    due_on: null,
    event_id: null,
    ...over,
  };
}

function semester(over: Partial<Semester> = {}): Semester {
  return {
    id: "sem-1",
    userId: "u1",
    name: "Fall 2026",
    startsOn: "2026-08-20",
    ...over,
  };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: "c1",
    userId: "u1",
    semesterId: "sem-1",
    title: "Data Structures",
    code: "CS 201",
    scale: DEFAULT_SCALE,
    ...over,
  };
}

function category(over: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    userId: "u1",
    courseId: "c1",
    name: "Exams",
    weight: 100,
    dropLowest: 0,
    extraCredit: false,
    position: 0,
    ...over,
  };
}

function gradeItem(over: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "item-1",
    userId: "u1",
    courseId: "c1",
    categoryId: "cat-1",
    title: "Midterm",
    score: null,
    maxScore: 100,
    ...over,
  };
}

beforeEach(() => {
  resetDb();
});

describe("loading", () => {
  it("starts empty on the server so hydration matches", async () => {
    const s = await store({ semesters: [semesterRow()] });
    expect(s.getServerSnapshot().semesters).toEqual([]);
  });

  it("remembers who is signed in", async () => {
    const s = await store();
    expect(s.currentUserId()).toBe("u1");
  });

  it("loads all four tables at once", async () => {
    const s = await store({
      semesters: [semesterRow()],
      courses: [courseRow()],
      categories: [categoryRow()],
      grade_items: [itemRow()],
    });
    const data = s.getSnapshot();
    expect(data.semesters).toHaveLength(1);
    expect(data.courses).toHaveLength(1);
    expect(data.categories).toHaveLength(1);
    expect(data.items).toHaveLength(1);
  });

  it("maps a course row into a course", async () => {
    const s = await store({
      courses: [courseRow({ color: "pink" })],
    });
    expect(s.getSnapshot().courses[0]).toMatchObject({
      id: "c1",
      userId: "u1",
      semesterId: "sem-1",
      title: "Data Structures",
      code: "CS 201",
      color: "pink",
    });
  });

  it("maps a category row, including the flags", async () => {
    const s = await store({
      categories: [
        categoryRow({ drop_lowest: 2, extra_credit: true, position: 3 }),
      ],
    });
    expect(s.getSnapshot().categories[0]).toMatchObject({
      dropLowest: 2,
      extraCredit: true,
      position: 3,
    });
  });

  it("keeps an unmarked score as null rather than zero", async () => {
    const s = await store({ grade_items: [itemRow({ score: null })] });
    expect(s.getSnapshot().items[0].score).toBeNull();
  });

  it("loads only once even when several callers ask", async () => {
    resetDb();
    vi.resetModules();
    const s: Store = await import("@/modules/academic/lib/course-store");
    await Promise.all([s.ensureLoaded(), s.ensureLoaded(), s.ensureLoaded()]);
    expect(calls().filter((c) => c === "select users")).toHaveLength(1);
  });

  it("hands back the same object until a write replaces it", async () => {
    const s = await store();
    expect(s.getSnapshot()).toBe(s.getSnapshot());
  });

  it("tells subscribers when something changes", async () => {
    const s = await store();
    const seen = vi.fn();
    const off = s.subscribe(seen);
    await s.addSemester(semester());
    expect(seen).toHaveBeenCalled();
    off();
  });
});

describe("semesters", () => {
  it("adds one", async () => {
    const s = await store();
    await s.addSemester(semester());
    expect(stored("semesters")).toHaveLength(1);
    expect(s.getSnapshot().semesters[0].name).toBe("Fall 2026");
  });

  it("stamps the owner from the session", async () => {
    const s = await store();
    await s.addSemester(semester({ userId: "" }));
    expect(storedIn("semesters", "sem-1")?.user_id).toBe("u1");
  });

  it("saves a change to the name or the start date", async () => {
    const s = await store({ semesters: [semesterRow()] });
    await s.saveSemester(semester({ name: "Autumn 2026" }));
    expect(storedIn("semesters", "sem-1")?.name).toBe("Autumn 2026");
    expect(stored("semesters")).toHaveLength(1);
  });

  it("deletes one", async () => {
    const s = await store({ semesters: [semesterRow()] });
    await s.deleteSemester("sem-1");
    expect(stored("semesters")).toHaveLength(0);
  });

  it("clears its courses, categories and scores from view", async () => {
    const s = await store({
      semesters: [semesterRow()],
      courses: [courseRow()],
      categories: [categoryRow()],
      grade_items: [itemRow()],
    });
    await s.deleteSemester("sem-1");
    const data = s.getSnapshot();
    expect(data.courses).toHaveLength(0);
    expect(data.categories).toHaveLength(0);
    expect(data.items).toHaveLength(0);
  });

  it("leaves another semester alone", async () => {
    const s = await store({
      semesters: [semesterRow(), semesterRow({ id: "sem-2" })],
      courses: [courseRow({ id: "c2", semester_id: "sem-2" })],
    });
    await s.deleteSemester("sem-1");
    expect(s.getSnapshot().courses.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("saving a course", () => {
  it("inserts a new course with its categories", async () => {
    const s = await store();
    await s.saveCourse(course(), [
      category({ id: "a", name: "Exams", weight: 60 }),
      category({ id: "b", name: "Homework", weight: 40 }),
    ]);
    expect(stored("courses")).toHaveLength(1);
    expect(stored("categories")).toHaveLength(2);
  });

  it("numbers the categories in the order they were given", async () => {
    const s = await store();
    await s.saveCourse(course(), [
      category({ id: "a", name: "Exams" }),
      category({ id: "b", name: "Homework" }),
    ]);
    expect(storedIn("categories", "b")?.position).toBe(1);
  });

  it("updates an existing course instead of adding a second", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow()],
    });
    await s.saveCourse(course({ title: "Algorithms" }), [category()]);
    expect(stored("courses")).toHaveLength(1);
    expect(storedIn("courses", "c1")?.title).toBe("Algorithms");
  });

  it("adds a category that was not there before", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow({ id: "a", weight: 100 })],
    });
    await s.saveCourse(course(), [
      category({ id: "a", weight: 60 }),
      category({ id: "b", name: "Homework", weight: 40 }),
    ]);
    expect(stored("categories")).toHaveLength(2);
    expect(storedIn("categories", "b")?.name).toBe("Homework");
  });

  it("changes a category that was edited", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow({ id: "a", weight: 100, drop_lowest: 0 })],
    });
    await s.saveCourse(course(), [
      category({ id: "a", weight: 100, dropLowest: 2 }),
    ]);
    expect(storedIn("categories", "a")?.drop_lowest).toBe(2);
  });

  it("removes a category that was taken away", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow({ id: "a" }), categoryRow({ id: "b" })],
    });
    await s.saveCourse(course(), [category({ id: "a" })]);
    expect(stored("categories").map((c) => c.id)).toEqual(["a"]);
  });

  it("drops the scores that belonged to a removed category", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow({ id: "a" }), categoryRow({ id: "b" })],
      grade_items: [itemRow({ id: "x", category_id: "b" })],
    });
    await s.saveCourse(course(), [category({ id: "a" })]);
    expect(s.getSnapshot().items).toHaveLength(0);
  });

  it("keeps the extra credit flag", async () => {
    const s = await store();
    await s.saveCourse(course(), [
      category({ id: "a", weight: 100 }),
      category({ id: "b", name: "Bonus", weight: 5, extraCredit: true }),
    ]);
    expect(storedIn("categories", "b")?.extra_credit).toBe(true);
  });

  it("keeps the course scale", async () => {
    const s = await store();
    const harsh = [
      { letter: "A" as const, min: 95 },
      { letter: "F" as const, min: 0 },
    ];
    await s.saveCourse(course({ scale: harsh }), [category()]);
    expect(storedIn("courses", "c1")?.scale).toEqual(harsh);
  });

  it("leaves another course's categories alone", async () => {
    const s = await store({
      courses: [courseRow(), courseRow({ id: "c2" })],
      categories: [
        categoryRow({ id: "a", course_id: "c1" }),
        categoryRow({ id: "z", course_id: "c2" }),
      ],
    });
    await s.saveCourse(course(), [category({ id: "a" })]);
    expect(storedIn("categories", "z")).toBeDefined();
  });
});

describe("deleting a course", () => {
  it("takes its categories and scores with it", async () => {
    const s = await store({
      courses: [courseRow()],
      categories: [categoryRow()],
      grade_items: [itemRow()],
    });
    await s.deleteCourse("c1");
    const data = s.getSnapshot();
    expect(data.courses).toHaveLength(0);
    expect(data.categories).toHaveLength(0);
    expect(data.items).toHaveLength(0);
  });

  it("leaves another course standing", async () => {
    const s = await store({
      courses: [courseRow(), courseRow({ id: "c2" })],
      categories: [categoryRow({ id: "z", course_id: "c2" })],
    });
    await s.deleteCourse("c1");
    expect(s.getSnapshot().courses.map((c) => c.id)).toEqual(["c2"]);
    expect(s.getSnapshot().categories).toHaveLength(1);
  });
});

describe("grade items", () => {
  it("adds one with no score yet", async () => {
    const s = await store({ courses: [courseRow()] });
    await s.saveItem(gradeItem());
    expect(storedIn("grade_items", "item-1")?.score).toBeNull();
  });

  it("updates one that already exists", async () => {
    const s = await store({ grade_items: [itemRow()] });
    await s.saveItem(gradeItem({ title: "Final" }));
    expect(stored("grade_items")).toHaveLength(1);
    expect(storedIn("grade_items", "item-1")?.title).toBe("Final");
  });

  it("writes a score in", async () => {
    const s = await store({ grade_items: [itemRow()] });
    await s.setScore("item-1", 88);
    expect(storedIn("grade_items", "item-1")?.score).toBe(88);
    expect(s.getSnapshot().items[0].score).toBe(88);
  });

  it("clears a score back to unmarked", async () => {
    const s = await store({ grade_items: [itemRow({ score: 88 })] });
    await s.setScore("item-1", null);
    expect(storedIn("grade_items", "item-1")?.score).toBeNull();
  });

  it("does nothing for a score on an item that is gone", async () => {
    const s = await store();
    await s.setScore("missing", 50);
    expect(stored("grade_items")).toHaveLength(0);
  });

  it("deletes one", async () => {
    const s = await store({ grade_items: [itemRow()] });
    await s.deleteItem("item-1");
    expect(stored("grade_items")).toHaveLength(0);
  });

  it("keeps the due date", async () => {
    const s = await store();
    await s.saveItem(gradeItem({ dueOn: "2026-10-01" }));
    expect(storedIn("grade_items", "item-1")?.due_on).toBe("2026-10-01");
  });
});

describe("when a write is refused", () => {
  it("says so instead of staying quiet", async () => {
    const s = await store();
    failOn("insert semesters");
    await s.addSemester(semester());
    expect(s.lastWriteError()).toContain("refused");
  });

  it("puts the view back to what the database really holds", async () => {
    const s = await store({ semesters: [semesterRow()] });
    failOn("insert semesters");
    await s.addSemester(semester({ id: "ghost" }));
    expect(s.getSnapshot().semesters.map((x) => x.id)).toEqual(["sem-1"]);
  });

  it("clears the old message once a write succeeds", async () => {
    const s = await store();
    failOn("insert semesters");
    await s.addSemester(semester());
    expect(s.lastWriteError()).not.toBeNull();
    await s.saveItem(gradeItem());
    expect(s.lastWriteError()).toBeNull();
  });
});
