import type {
  Category,
  Course,
  GradeItem,
  Letter,
} from "@lifeos/contracts";
import { LETTERS } from "@lifeos/contracts";
import { gradeCourse, letterFor, ratio, round2 } from "@/modules/academic/lib/grade";

export type Chance = { letter: Letter; chance: number };

export type PredictOptions = {
  trials?: number;
  random?: () => number;
};

const MIN_SPREAD = 6;
const DEFAULT_TRIALS = 5000;

export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number, mean: number, spread: number): number {
  const u1 = Math.max(random(), 1e-9);
  const u2 = random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * spread;
}

function meanOf(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function spreadOf(values: number[], mean: number): number {
  if (values.length < 2) return MIN_SPREAD;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.max(MIN_SPREAD, Math.sqrt(variance));
}

type Shape = { mean: number; spread: number };

function shapes(
  categories: Category[],
  items: GradeItem[],
): { byCategory: Map<string, Shape>; course: Shape | null } {
  const marked = items.filter((item) => item.score !== null);
  if (!marked.length) return { byCategory: new Map(), course: null };

  const all = marked.map((item) => ratio(item) * 100);
  const courseMean = meanOf(all);
  const course = { mean: courseMean, spread: spreadOf(all, courseMean) };

  const byCategory = new Map<string, Shape>();
  for (const category of categories) {
    const mine = marked
      .filter((item) => item.categoryId === category.id)
      .map((item) => ratio(item) * 100);
    if (!mine.length) continue;
    const mean = meanOf(mine);
    byCategory.set(category.id, { mean, spread: spreadOf(mine, mean) });
  }

  return { byCategory, course };
}

export function predict(
  course: Course,
  categories: Category[],
  items: GradeItem[],
  options: PredictOptions = {},
): Chance[] | null {
  const mine = categories.filter((c) => c.courseId === course.id);
  const ours = items.filter((item) => item.courseId === course.id);
  const { byCategory, course: courseShape } = shapes(mine, ours);
  if (!courseShape) return null;

  const trials = options.trials ?? DEFAULT_TRIALS;
  const random = options.random ?? Math.random;
  const pending = ours.filter((item) => item.score === null);

  const counts = new Map<Letter, number>(LETTERS.map((l) => [l, 0]));

  for (let run = 0; run < trials; run += 1) {
    const filled = pending.map((item) => {
      const shape = byCategory.get(item.categoryId) ?? courseShape;
      const drawn = normal(random, shape.mean, shape.spread);
      const clamped = Math.min(100, Math.max(0, drawn));
      return { ...item, score: (clamped / 100) * item.maxScore };
    });

    const final = gradeCourse(course, mine, [
      ...ours.filter((item) => item.score !== null),
      ...filled,
    ]);

    const letter = letterFor(final.banked, course.scale);
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  return LETTERS.map((letter) => ({
    letter,
    chance: round2(((counts.get(letter) ?? 0) / trials) * 100),
  }));
}
