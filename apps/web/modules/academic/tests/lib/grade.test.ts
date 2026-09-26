import { describe, expect, it } from "vitest";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import {
  extraTotal,
  gradeCategory,
  gradeCourse,
  letterFor,
  ratio,
  weightTotal,
} from "@/modules/academic/lib/grade";

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

describe("letterFor", () => {
  it("gives an A at the cutoff", () => {
    expect(letterFor(90)).toBe("A");
  });

  it("gives a B just below it", () => {
    expect(letterFor(89.99)).toBe("B");
  });

  it("gives an F at zero", () => {
    expect(letterFor(0)).toBe("F");
  });

  it("stays an A above a hundred, which extra credit allows", () => {
    expect(letterFor(104)).toBe("A");
  });

  it("uses the scale it is given", () => {
    const easy = [
      { letter: "A" as const, min: 80 },
      { letter: "F" as const, min: 0 },
    ];
    expect(letterFor(82, easy)).toBe("A");
  });

  it("does not care what order the scale is written in", () => {
    const jumbled = [
      { letter: "F" as const, min: 0 },
      { letter: "A" as const, min: 90 },
      { letter: "C" as const, min: 70 },
    ];
    expect(letterFor(95, jumbled)).toBe("A");
    expect(letterFor(75, jumbled)).toBe("C");
  });
});

describe("ratio", () => {
  it("is zero for an unmarked item", () => {
    expect(ratio(item())).toBe(0);
  });

  it("divides the score by what it was out of", () => {
    expect(ratio(item({ score: 18, maxScore: 20 }))).toBe(0.9);
  });

  it("refuses to divide by zero", () => {
    expect(ratio(item({ score: 5, maxScore: 0 }))).toBe(0);
  });
});

describe("gradeCategory, what counts", () => {
  it("looks only at its own items", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 90 }),
      item({ categoryId: "other", score: 10 }),
    ]);
    expect(out.pct).toBe(90);
  });

  it("has no percentage before anything is marked", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [item({ categoryId: "mine" })]);
    expect(out.pct).toBeNull();
    expect(out.progress).toBe(0);
  });

  it("adds up points earned and points possible", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 18, maxScore: 20 }),
      item({ categoryId: "mine", score: 27, maxScore: 30 }),
    ]);
    expect(out.earned).toBe(45);
    expect(out.possible).toBe(50);
    expect(out.pct).toBe(90);
  });

  it("lists what is still waiting for a score", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 90 }),
      item({ categoryId: "mine" }),
      item({ categoryId: "mine" }),
    ]);
    expect(out.pending).toHaveLength(2);
  });
});

describe("gradeCategory, drop lowest", () => {
  it("keeps everything when the course drops nothing", () => {
    const cat = category({ id: "mine", dropLowest: 0 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 50 }),
      item({ categoryId: "mine", score: 100 }),
    ]);
    expect(out.dropped).toHaveLength(0);
    expect(out.pct).toBe(75);
  });

  it("drops the single worst score", () => {
    const cat = category({ id: "mine", dropLowest: 1 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 50 }),
      item({ categoryId: "mine", score: 90 }),
      item({ categoryId: "mine", score: 100 }),
    ]);
    expect(out.dropped).toHaveLength(1);
    expect(out.dropped[0].score).toBe(50);
    expect(out.pct).toBe(95);
  });

  it("drops two when the course says two", () => {
    const cat = category({ id: "mine", dropLowest: 2 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 40 }),
      item({ categoryId: "mine", score: 50 }),
      item({ categoryId: "mine", score: 80 }),
      item({ categoryId: "mine", score: 100 }),
    ]);
    expect(out.dropped.map((d) => d.score)).toEqual([40, 50]);
    expect(out.pct).toBe(90);
  });

  it("judges lowest by proportion, not by the raw number", () => {
    const cat = category({ id: "mine", dropLowest: 1 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 8, maxScore: 10 }),
      item({ categoryId: "mine", score: 40, maxScore: 100 }),
    ]);
    expect(out.dropped[0].maxScore).toBe(100);
  });

  it("only ever drops among the scores that exist today", () => {
    const cat = category({ id: "mine", dropLowest: 1 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 60 }),
      item({ categoryId: "mine", score: 90 }),
      item({ categoryId: "mine" }),
      item({ categoryId: "mine" }),
    ]);
    expect(out.dropped[0].score).toBe(60);
    expect(out.pct).toBe(90);
  });

  it("never drops the only score there is", () => {
    const cat = category({ id: "mine", dropLowest: 2 });
    const out = gradeCategory(cat, [item({ categoryId: "mine", score: 40 })]);
    expect(out.dropped).toHaveLength(0);
    expect(out.pct).toBe(40);
  });

  it("changes its mind as new scores arrive", () => {
    const cat = category({ id: "mine", dropLowest: 1 });
    const early = gradeCategory(cat, [
      item({ categoryId: "mine", score: 70 }),
      item({ categoryId: "mine", score: 90 }),
    ]);
    const later = gradeCategory(cat, [
      item({ categoryId: "mine", score: 70 }),
      item({ categoryId: "mine", score: 90 }),
      item({ categoryId: "mine", score: 30 }),
    ]);
    expect(early.dropped[0].score).toBe(70);
    expect(later.dropped[0].score).toBe(30);
    expect(later.pct).toBe(80);
  });
});

describe("gradeCategory, progress", () => {
  it("is nothing before the term starts", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine" }),
      item({ categoryId: "mine" }),
    ]);
    expect(out.progress).toBe(0);
  });

  it("is a half when half the points are marked", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 80 }),
      item({ categoryId: "mine" }),
    ]);
    expect(out.progress).toBe(0.5);
  });

  it("is everything once every item is marked", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 80 }),
      item({ categoryId: "mine", score: 60 }),
    ]);
    expect(out.progress).toBe(1);
  });

  it("reaches everything even when the course drops one", () => {
    const cat = category({ id: "mine", dropLowest: 1 });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 80 }),
      item({ categoryId: "mine", score: 60 }),
      item({ categoryId: "mine", score: 90 }),
    ]);
    expect(out.progress).toBe(1);
  });

  it("weighs items by the points they carry, not by how many there are", () => {
    const cat = category({ id: "mine" });
    const out = gradeCategory(cat, [
      item({ categoryId: "mine", score: 10, maxScore: 10 }),
      item({ categoryId: "mine", maxScore: 90 }),
    ]);
    expect(out.progress).toBe(0.1);
  });
});

describe("gradeCourse", () => {
  it("has no grade before anything is marked", () => {
    const out = gradeCourse(
      course(),
      [category({ id: "cat-a" })],
      [item({ categoryId: "cat-a" })],
    );
    expect(out.currentGrade).toBeNull();
    expect(out.letter).toBeNull();
    expect(out.banked).toBe(0);
  });

  it("gives the plain weighted average once everything is marked", () => {
    const cats = [
      category({ id: "exams", weight: 60 }),
      category({ id: "hw", weight: 40 }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "exams", score: 90 }),
      item({ categoryId: "hw", score: 80 }),
    ]);
    expect(out.banked).toBe(86);
    expect(out.currentGrade).toBe(86);
    expect(out.letter).toBe("B");
  });

  it("does not let an unmarked final drag the grade down", () => {
    const cats = [
      category({ id: "exams", weight: 60 }),
      category({ id: "hw", weight: 40 }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "exams", score: 90 }),
      item({ categoryId: "exams" }),
      item({ categoryId: "hw", score: 80 }),
    ]);
    expect(out.currentGrade).toBe(84.29);
    expect(out.banked).toBe(59);
  });

  it("says how much of the course is already locked in", () => {
    const cats = [
      category({ id: "exams", weight: 60 }),
      category({ id: "hw", weight: 40 }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "exams", score: 90 }),
      item({ categoryId: "exams" }),
      item({ categoryId: "hw", score: 80 }),
    ]);
    expect(out.marked).toBe(70);
    expect(out.remaining).toBe(30);
    expect(out.required).toBe(100);
  });

  it("counts a part marked category as a part, not as a whole", () => {
    const cats = [category({ id: "hw", weight: 100 })];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "hw", score: 100 }),
      item({ categoryId: "hw" }),
      item({ categoryId: "hw" }),
      item({ categoryId: "hw" }),
    ]);
    expect(out.marked).toBe(25);
    expect(out.banked).toBe(25);
    expect(out.currentGrade).toBe(100);
  });

  it("leaves extra credit out of what the course is worth", () => {
    const cats = [
      category({ id: "exams", weight: 100 }),
      category({ id: "bonus", weight: 5, extraCredit: true }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "exams", score: 90 }),
      item({ categoryId: "bonus", score: 100 }),
    ]);
    expect(out.required).toBe(100);
    expect(out.marked).toBe(100);
    expect(out.banked).toBe(95);
    expect(out.currentGrade).toBe(95);
  });

  it("lets extra credit carry a grade past a hundred", () => {
    const cats = [
      category({ id: "exams", weight: 100 }),
      category({ id: "bonus", weight: 5, extraCredit: true }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "exams", score: 100 }),
      item({ categoryId: "bonus", score: 100 }),
    ]);
    expect(out.banked).toBe(105);
    expect(out.currentGrade).toBe(105);
    expect(out.letter).toBe("A");
  });

  it("ignores categories belonging to another course", () => {
    const cats = [
      category({ id: "mine", courseId: "c1", weight: 100 }),
      category({ id: "theirs", courseId: "c2", weight: 100 }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "mine", score: 70 }),
      item({ categoryId: "theirs", score: 10 }),
    ]);
    expect(out.categories).toHaveLength(1);
    expect(out.currentGrade).toBe(70);
  });

  it("returns the categories in the order they were arranged", () => {
    const cats = [
      category({ id: "b", name: "Homework", position: 1 }),
      category({ id: "a", name: "Exams", position: 0 }),
    ];
    const out = gradeCourse(course(), cats, []);
    expect(out.categories.map((c) => c.category.name)).toEqual([
      "Exams",
      "Homework",
    ]);
  });

  it("uses the scale the course carries", () => {
    const easy = course({
      scale: [
        { letter: "A", min: 80 },
        { letter: "F", min: 0 },
      ],
    });
    const out = gradeCourse(easy, [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 85 }),
    ]);
    expect(out.letter).toBe("A");
  });

  it("carries drop lowest through to the course grade", () => {
    const cats = [category({ id: "quiz", weight: 100, dropLowest: 1 })];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "quiz", score: 20 }),
      item({ categoryId: "quiz", score: 100 }),
    ]);
    expect(out.currentGrade).toBe(100);
  });
});

describe("weight totals", () => {
  it("adds up only the required categories", () => {
    expect(
      weightTotal([
        category({ weight: 60 }),
        category({ weight: 40 }),
        category({ weight: 5, extraCredit: true }),
      ]),
    ).toBe(100);
  });

  it("adds up the extra credit separately", () => {
    expect(
      extraTotal([
        category({ weight: 60 }),
        category({ weight: 5, extraCredit: true }),
      ]),
    ).toBe(5);
  });

  it("is zero for a course with no categories", () => {
    expect(weightTotal([])).toBe(0);
    expect(extraTotal([])).toBe(0);
  });
});

describe("the highest the course can still finish", () => {
  it("is the current grade once everything is marked", () => {
    const out = gradeCourse(course(), [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 84 }),
    ]);
    expect(out.ceiling).toBe(84);
    expect(out.ceilingLetter).toBe("B");
  });

  it("assumes full marks on everything not yet marked", () => {
    const out = gradeCourse(course(), [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 84 }),
      item({ categoryId: "x" }),
    ]);
    expect(out.ceiling).toBe(92);
  });

  it("counts a category nobody has filled in yet", () => {
    const cats = [
      category({ id: "a", weight: 50 }),
      category({ id: "b", weight: 50 }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "a", score: 100 }),
    ]);
    expect(out.ceiling).toBe(100);
  });

  it("counts extra credit still up for grabs, without undoing points already lost", () => {
    const cats = [
      category({ id: "x", weight: 100 }),
      category({ id: "bonus", weight: 5, extraCredit: true }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "x", score: 90 }),
      item({ categoryId: "bonus" }),
    ]);
    expect(out.ceiling).toBe(95);
  });

  it("does reach past a hundred when nothing has been lost", () => {
    const cats = [
      category({ id: "x", weight: 100 }),
      category({ id: "bonus", weight: 5, extraCredit: true }),
    ];
    const out = gradeCourse(course(), cats, [
      item({ categoryId: "x" }),
      item({ categoryId: "bonus" }),
    ]);
    expect(out.ceiling).toBe(105);
  });

  it("is nothing when every mark so far is a zero and nothing is left", () => {
    const out = gradeCourse(course(), [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 0 }),
    ]);
    expect(out.ceiling).toBe(0);
    expect(out.ceilingLetter).toBe("F");
  });
});

describe("the letter on what is already earned", () => {
  it("is the letter of the points banked so far", () => {
    const out = gradeCourse(course(), [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 84 }),
      item({ categoryId: "x" }),
    ]);
    expect(out.banked).toBe(42);
    expect(out.bankedLetter).toBe("F");
  });

  it("climbs as more of the course is banked", () => {
    const out = gradeCourse(course(), [category({ id: "x", weight: 100 })], [
      item({ categoryId: "x", score: 84 }),
      item({ categoryId: "x", score: 84 }),
    ]);
    expect(out.banked).toBe(84);
    expect(out.bankedLetter).toBe("B");
  });
});
