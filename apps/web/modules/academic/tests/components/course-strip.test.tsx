import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import { gradeCourse, type CourseGrade } from "@/modules/academic/lib/grade";
import { CourseStrip } from "@/modules/academic/components/course-strip";

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

function item(over: Partial<GradeItem> = {}): GradeItem {
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

function gradesFor(
  courses: Course[],
  categories: Category[],
  items: GradeItem[],
): Map<string, CourseGrade> {
  const out = new Map<string, CourseGrade>();
  for (const one of courses) {
    out.set(one.id, gradeCourse(one, categories, items));
  }
  return out;
}

function setup(
  courses: Course[],
  categories: Category[] = [],
  items: GradeItem[] = [],
  selected: string | null = null,
) {
  const onSelect = vi.fn();
  const onNew = vi.fn();
  render(
    <CourseStrip
      courses={courses}
      grades={gradesFor(courses, categories, items)}
      selected={selected}
      onSelect={onSelect}
      onNew={onNew}
    />,
  );
  return { onSelect, onNew };
}

describe("the course strip", () => {
  it("offers a way to add the first course", () => {
    setup([]);
    expect(screen.getByRole("button", { name: "New course" })).toBeDefined();
  });

  it("shows the code when there is one", () => {
    setup([course()], [category()], [item({ score: 90 })]);
    expect(screen.getByText("CS 201")).toBeDefined();
  });

  it("falls back to the title when there is no code", () => {
    setup([course({ code: undefined })], [category()], []);
    expect(screen.getByText("Data Structures")).toBeDefined();
  });

  it("shows the grade and its letter", () => {
    setup([course()], [category()], [item({ score: 84 })]);
    expect(screen.getByText("84%")).toBeDefined();
    expect(screen.getByText("B")).toBeDefined();
  });

  it("shows dashes before anything is marked", () => {
    setup([course()], [category()], [item()]);
    expect(screen.getByText("--")).toBeDefined();
  });

  it("says how much of the course is banked", () => {
    setup([course()], [category()], [item({ score: 90 }), item({ id: "i2" })]);
    expect(screen.getByText("45 of 100 banked")).toBeDefined();
  });

  it("marks the course that is open", () => {
    setup([course()], [category()], [], "c1");
    const card = screen.getByRole("button", { name: /CS 201/ });
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("reports a different course being picked", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup(
      [course(), course({ id: "c2", code: "MATH 241" })],
      [category()],
      [],
      "c1",
    );
    await user.click(screen.getByRole("button", { name: /MATH 241/ }));
    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("asks for a new course", async () => {
    const user = userEvent.setup();
    const { onNew } = setup([course()]);
    await user.click(screen.getByRole("button", { name: "New course" }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("lays the courses out in a row", () => {
    const { container } = render(
      <CourseStrip
        courses={[course(), course({ id: "c2" })]}
        grades={new Map()}
        selected={null}
        onSelect={() => {}}
        onNew={() => {}}
      />,
    );
    expect(container.firstElementChild?.className).toContain("flex");
  });
});
