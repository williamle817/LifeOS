import {
  DEFAULT_SCALE,
  type Category,
  type Course,
  type GradeItem,
  type Semester,
} from "@lifeos/contracts";

export function semester(over: Partial<Semester> = {}): Semester {
  return {
    id: "sem-1",
    userId: "u1",
    name: "Fall 2026",
    startsOn: "2020-08-20",
    ...over,
  };
}

export function course(over: Partial<Course> = {}): Course {
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

export function category(over: Partial<Category> = {}): Category {
  return {
    id: "exams",
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

export function item(over: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "i1",
    userId: "u1",
    courseId: "c1",
    categoryId: "exams",
    title: "Midterm",
    score: null,
    maxScore: 100,
    ...over,
  };
}
