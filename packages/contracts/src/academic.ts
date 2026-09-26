import type { EventColor } from "./event";

export const LETTERS = ["A", "B", "C", "D", "F"] as const;

export type Letter = (typeof LETTERS)[number];

export type ScaleStep = { letter: Letter; min: number };

export const DEFAULT_SCALE: ScaleStep[] = [
  { letter: "A", min: 90 },
  { letter: "B", min: 80 },
  { letter: "C", min: 70 },
  { letter: "D", min: 60 },
  { letter: "F", min: 0 },
];

export type Semester = {
  id: string;
  userId: string;
  name: string;
  startsOn: string;
};

export type Course = {
  id: string;
  userId: string;
  semesterId: string;
  title: string;
  code?: string;
  color?: EventColor;
  scale: ScaleStep[];
};

export type Category = {
  id: string;
  userId: string;
  courseId: string;
  name: string;
  weight: number;
  dropLowest: number;
  extraCredit: boolean;
  position: number;
};

export type GradeItem = {
  id: string;
  userId: string;
  courseId: string;
  categoryId: string;
  title: string;
  score: number | null;
  maxScore: number;
  dueOn?: string;
  eventId?: string;
};
