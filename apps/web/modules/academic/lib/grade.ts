import type {
  Category,
  Course,
  GradeItem,
  Letter,
  ScaleStep,
} from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";

export type CategoryGrade = {
  category: Category;
  kept: GradeItem[];
  dropped: GradeItem[];
  pending: GradeItem[];
  earned: number;
  possible: number;
  pct: number | null;
  progress: number;
};

export type CourseGrade = {
  categories: CategoryGrade[];
  banked: number;
  bankedLetter: Letter;
  marked: number;
  required: number;
  remaining: number;
  ceiling: number;
  ceilingLetter: Letter;
  currentGrade: number | null;
  letter: Letter | null;
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function show(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ratio(item: GradeItem): number {
  if (item.score === null || item.maxScore <= 0) return 0;
  return item.score / item.maxScore;
}

export function letterFor(
  pct: number,
  scale: ScaleStep[] = DEFAULT_SCALE,
): Letter {
  const ordered = [...scale].sort((a, b) => b.min - a.min);
  const hit = ordered.find((step) => pct >= step.min);
  return hit ? hit.letter : ordered[ordered.length - 1].letter;
}

export function gradeCategory(
  category: Category,
  items: GradeItem[],
): CategoryGrade {
  const mine = items.filter((item) => item.categoryId === category.id);
  const marked = mine.filter((item) => item.score !== null);
  const pending = mine.filter((item) => item.score === null);

  const drops = Math.max(0, Math.min(category.dropLowest, marked.length - 1));
  const byScore = [...marked].sort((a, b) => ratio(a) - ratio(b));
  const dropped = byScore.slice(0, drops);
  const kept = byScore.slice(drops);

  const earned = kept.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const possible = kept.reduce((sum, item) => sum + item.maxScore, 0);

  const byMax = [...mine].sort((a, b) => a.maxScore - b.maxScore);
  const planned = byMax.slice(Math.min(category.dropLowest, Math.max(0, mine.length - 1)));
  const plannedPossible = planned.reduce((sum, item) => sum + item.maxScore, 0);

  const progress =
    plannedPossible > 0 ? Math.min(1, possible / plannedPossible) : 0;

  return {
    category,
    kept,
    dropped,
    pending,
    earned: round2(earned),
    possible: round2(possible),
    pct: possible > 0 ? round2((earned / possible) * 100) : null,
    progress,
  };
}

export function gradeCourse(
  course: Course,
  categories: Category[],
  items: GradeItem[],
): CourseGrade {
  const mine = categories
    .filter((category) => category.courseId === course.id)
    .sort((a, b) => a.position - b.position);

  const graded = mine.map((category) => gradeCategory(category, items));

  let banked = 0;
  let marked = 0;
  let required = 0;

  for (const entry of graded) {
    const weight = entry.category.weight;
    banked += (weight * (entry.pct ?? 0) * entry.progress) / 100;
    if (entry.category.extraCredit) continue;
    marked += weight * entry.progress;
    required += weight;
  }

  const topped = items.map((item) =>
    item.score === null ? { ...item, score: item.maxScore } : item,
  );

  let ceiling = 0;
  for (const category of mine) {
    const held = items.some((item) => item.categoryId === category.id);
    if (!held) {
      ceiling += category.weight;
      continue;
    }
    const full = gradeCategory(category, topped);
    ceiling += (category.weight * (full.pct ?? 0) * full.progress) / 100;
  }

  const currentGrade = marked > 0 ? round2((banked / marked) * 100) : null;

  return {
    categories: graded,
    banked: round2(banked),
    bankedLetter: letterFor(round2(banked), course.scale),
    marked: round2(marked),
    required: round2(required),
    remaining: round2(required - marked),
    ceiling: round2(ceiling),
    ceilingLetter: letterFor(round2(ceiling), course.scale),
    currentGrade,
    letter: currentGrade === null ? null : letterFor(currentGrade, course.scale),
  };
}

export function weightTotal(categories: Category[]): number {
  return round2(
    categories
      .filter((category) => !category.extraCredit)
      .reduce((sum, category) => sum + category.weight, 0),
  );
}

export function extraTotal(categories: Category[]): number {
  return round2(
    categories
      .filter((category) => category.extraCredit)
      .reduce((sum, category) => sum + category.weight, 0),
  );
}
