import { describe, expect, it } from "vitest";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import { predict, seeded } from "@/modules/academic/lib/predict";

let seq = 0;

function category(over: Partial<Category> = {}): Category {
  seq += 1;
  return {
    id: `cat-${seq}`,
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

function item(over: Partial<GradeItem> = {}): GradeItem {
  seq += 1;
  return {
    id: `item-${seq}`,
    userId: "u1",
    courseId: "c1",
    categoryId: "cat-1",
    title: "Item",
    score: null,
    maxScore: 100,
    ...over,
  };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: "c1",
    userId: "u1",
    semesterId: "s1",
    title: "Data Structures",
    scale: DEFAULT_SCALE,
    ...over,
  };
}

function run(
  categories: Category[],
  items: GradeItem[],
  over: Partial<Course> = {},
) {
  return predict(course(over), categories, items, {
    trials: 2000,
    random: seeded(7),
  });
}

function chanceOf(result: ReturnType<typeof run>, letter: string): number {
  return result?.find((c) => c.letter === letter)?.chance ?? 0;
}

describe("predict, when it refuses", () => {
  it("says nothing when no score exists yet", () => {
    const cats = [category({ id: "exams" })];
    expect(run(cats, [item({ categoryId: "exams" })])).toBeNull();
  });

  it("says nothing for a course with no items at all", () => {
    expect(run([category({ id: "exams" })], [])).toBeNull();
  });
});

describe("predict, the shape of the answer", () => {
  it("gives one row per letter", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams" }),
    ]);
    expect(out?.map((c) => c.letter)).toEqual(["A", "B", "C", "D", "F"]);
  });

  it("adds up to a hundred percent", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams" }),
    ]);
    const total = out!.reduce((sum, c) => sum + c.chance, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.5);
  });

  it("gives the same answer twice for the same seed", () => {
    const cats = [category({ id: "exams" })];
    const items = [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams" }),
    ];
    expect(run(cats, items)).toEqual(run(cats, items));
  });
});

describe("predict, does it say sensible things", () => {
  it("is almost certain of an A for a student holding a hundred", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 100 }),
      item({ categoryId: "exams", score: 100 }),
      item({ categoryId: "exams", score: 100 }),
      item({ categoryId: "exams" }),
    ]);
    expect(chanceOf(out, "A")).toBeGreaterThan(90);
  });

  it("is almost certain of an F for a student holding twenty", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 20 }),
      item({ categoryId: "exams", score: 20 }),
      item({ categoryId: "exams", score: 20 }),
      item({ categoryId: "exams" }),
    ]);
    expect(chanceOf(out, "F")).toBeGreaterThan(90);
  });

  it("is certain once every item is marked", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams", score: 85 }),
    ]);
    expect(chanceOf(out, "B")).toBe(100);
  });

  it("is less sure when more of the course is still ahead", () => {
    const cats = [category({ id: "exams" })];
    const nearlyDone = run(cats, [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams" }),
    ]);
    const barelyStarted = run(cats, [
      item({ categoryId: "exams", score: 85 }),
      item({ categoryId: "exams" }),
      item({ categoryId: "exams" }),
      item({ categoryId: "exams" }),
    ]);
    expect(chanceOf(nearlyDone, "B")).toBeGreaterThan(
      chanceOf(barelyStarted, "B"),
    );
  });

  it("uses each category's own history rather than one course average", () => {
    const cats = [
      category({ id: "exams", weight: 50 }),
      category({ id: "hw", weight: 50 }),
    ];
    const out = run(cats, [
      item({ categoryId: "exams", score: 30 }),
      item({ categoryId: "exams" }),
      item({ categoryId: "hw", score: 100 }),
      item({ categoryId: "hw", score: 100 }),
    ]);
    expect(chanceOf(out, "D")).toBeGreaterThan(70);
    expect(chanceOf(out, "C")).toBeLessThan(20);
  });

  it("counts extra credit, so a bonus can lift the chance of an A", () => {
    const plain = [category({ id: "exams", weight: 100 })];
    const withBonus = [
      category({ id: "exams", weight: 100 }),
      category({ id: "bonus", weight: 8, extraCredit: true }),
    ];
    const base = run(plain, [
      item({ categoryId: "exams", score: 86 }),
      item({ categoryId: "exams", score: 86 }),
    ]);
    const lifted = run(withBonus, [
      item({ categoryId: "exams", score: 86 }),
      item({ categoryId: "exams", score: 86 }),
      item({ categoryId: "bonus", score: 100 }),
    ]);
    expect(chanceOf(base, "A")).toBe(0);
    expect(chanceOf(lifted, "A")).toBe(100);
  });

  it("applies drop lowest to the scores it invents, not only the real ones", () => {
    const cats = [category({ id: "quiz", weight: 100, dropLowest: 1 })];
    const kind = run(cats, [
      item({ categoryId: "quiz", score: 95 }),
      item({ categoryId: "quiz", score: 95 }),
      item({ categoryId: "quiz" }),
    ]);
    expect(chanceOf(kind, "A")).toBeGreaterThan(95);
  });

  it("follows the scale the course carries", () => {
    const cats = [category({ id: "exams" })];
    const harsh = run(
      cats,
      [item({ categoryId: "exams", score: 95 }), item({ categoryId: "exams" })],
      {
        scale: [
          { letter: "A", min: 98 },
          { letter: "F", min: 0 },
        ],
      },
    );
    expect(chanceOf(harsh, "A")).toBeLessThan(40);
  });

  it("ignores another course's items", () => {
    const cats = [category({ id: "exams" })];
    const out = run(cats, [
      item({ categoryId: "exams", score: 95 }),
      item({ categoryId: "exams" }),
      item({ courseId: "c2", categoryId: "other", score: 10 }),
    ]);
    expect(chanceOf(out, "A")).toBeGreaterThan(80);
  });
});
