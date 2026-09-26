import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Course } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import { CourseForm } from "@/modules/academic/components/course-form";

type Saved = { course: Course; categories: Category[] };

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

function setup(
  props: Partial<React.ComponentProps<typeof CourseForm>> = {},
): { saved: Saved[]; cancelled: () => number; deleted: () => number } {
  const saved: Saved[] = [];
  const onCancel = vi.fn();
  const onDelete = vi.fn();

  render(
    <CourseForm
      course={null}
      categories={[]}
      userId="u1"
      semesterId="sem-1"
      onSave={(c, cats) => saved.push({ course: c, categories: cats })}
      onCancel={onCancel}
      {...props}
    />,
  );

  return {
    saved,
    cancelled: () => onCancel.mock.calls.length,
    deleted: () => onDelete.mock.calls.length,
  };
}

describe("the course form, starting out", () => {
  it("says New course when nothing is being edited", () => {
    setup();
    expect(screen.getByText("New course")).toBeDefined();
  });

  it("starts with a set of categories that already add up to a hundred", () => {
    setup();
    expect(screen.getByText("100 of 100")).toBeDefined();
  });

  it("offers the three usual buckets to begin with", () => {
    setup();
    const names = ["Exams", "Homework", "Quizzes"];
    names.forEach((name, i) => {
      const field = screen.getByLabelText(
        `Category ${i + 1} name`,
      ) as HTMLInputElement;
      expect(field.value).toBe(name);
    });
  });

  it("says Edit course when a course is passed in", () => {
    setup({ course: course(), categories: [category()] });
    expect(screen.getByText("Edit course")).toBeDefined();
  });

  it("fills the fields from the course being edited", () => {
    setup({ course: course(), categories: [category()] });
    expect(
      (screen.getByLabelText("Course name") as HTMLInputElement).value,
    ).toBe("Data Structures");
    expect((screen.getByLabelText("Code") as HTMLInputElement).value).toBe(
      "CS 201",
    );
  });

  it("offers a delete button only when editing", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Delete course" })).toBeNull();
  });
});

describe("the course form, categories", () => {
  it("adds a row", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Add category" }));
    expect(screen.getByLabelText("Category 4 name")).toBeDefined();
  });

  it("removes a row", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Remove category 3" }));
    expect(screen.queryByLabelText("Category 3 name")).toBeNull();
  });

  it("keeps a running total as the weights change", async () => {
    const user = userEvent.setup();
    setup();
    const weight = screen.getByLabelText("Category 1 weight");
    await user.clear(weight);
    await user.type(weight, "50");
    expect(screen.getByText("110 of 100")).toBeDefined();
  });

  it("counts extra credit on top rather than inside the hundred", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText("Category 3 extra credit"));
    expect(screen.getByText(/70 of 100 plus 30 extra credit/)).toBeDefined();
  });

  it("refuses to save while the weights do not add up", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    const weight = screen.getByLabelText("Category 1 weight");
    await user.clear(weight);
    await user.click(screen.getByLabelText("Course name"));
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toHaveLength(0);
  });

  it("explains why it will not save", async () => {
    const user = userEvent.setup();
    setup();
    const weight = screen.getByLabelText("Category 1 weight");
    await user.clear(weight);
    expect(
      screen.getByText(/have to add up to 100/),
    ).toBeDefined();
  });

  it("saves once the weights balance again", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toHaveLength(1);
    expect(saved[0].categories).toHaveLength(3);
  });

  it("drops a category left without a name", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.clear(screen.getByLabelText("Category 3 name"));
    const weight = screen.getByLabelText("Category 1 weight");
    await user.clear(weight);
    await user.type(weight, "70");
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].categories).toHaveLength(2);
  });

  it("numbers the rows in the order they appear", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].categories.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it("carries drop lowest through", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    const drop = screen.getByLabelText("Category 1 drop lowest");
    await user.clear(drop);
    await user.type(drop, "2");
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].categories[0].dropLowest).toBe(2);
  });

  it("never lets drop lowest go negative", async () => {
    setup();
    expect(
      (screen.getByLabelText("Category 1 drop lowest") as HTMLInputElement).min,
    ).toBe("0");
  });
});

describe("the course form, the rest", () => {
  it("saves the course details", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.type(screen.getByLabelText("Code"), "PHYS 101");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].course).toMatchObject({
      title: "Physics",
      code: "PHYS 101",
      semesterId: "sem-1",
      userId: "u1",
    });
  });

  it("keeps the same course id when editing", async () => {
    const user = userEvent.setup();
    const { saved } = setup({ course: course(), categories: [category()] });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].course.id).toBe("c1");
  });

  it("picks a colour", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "pink" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].course.color).toBe("pink");
  });

  it("lets the letter cutoffs be moved", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    const cutoff = screen.getByLabelText("A cutoff");
    await user.clear(cutoff);
    await user.type(cutoff, "93");
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      saved[0].course.scale.find((s) => s.letter === "A")?.min,
    ).toBe(93);
  });

  it("does not offer a cutoff for F, which is whatever is left", () => {
    setup();
    expect(screen.queryByLabelText("F cutoff")).toBeNull();
  });

  it("backs out without saving", async () => {
    const user = userEvent.setup();
    const { saved, cancelled } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelled()).toBe(1);
    expect(saved).toHaveLength(0);
  });
});
