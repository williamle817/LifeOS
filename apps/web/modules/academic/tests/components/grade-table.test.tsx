import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import { gradeCourse } from "@/modules/academic/lib/grade";
import { GradeTable } from "@/modules/academic/components/grade-table";

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
    categoryId: "exams",
    title: "Midterm",
    score: null,
    maxScore: 100,
    ...over,
  };
}

const course: Course = {
  id: "c1",
  userId: "u1",
  semesterId: "sem-1",
  title: "Data Structures",
  scale: DEFAULT_SCALE,
};

function setup(categories: Category[], items: GradeItem[]) {
  const onScore = vi.fn();
  const onSave = vi.fn();
  const onRemove = vi.fn();
  const onSaveCategory = vi.fn();
  render(
    <GradeTable
      grade={gradeCourse(course, categories, items)}
      userId="u1"
      courseId="c1"
      onScore={onScore}
      onSave={onSave}
      onRemove={onRemove}
      onSaveCategory={onSaveCategory}
    />,
  );
  return { onScore, onSave, onRemove, onSaveCategory };
}

describe("the grade table, what it shows", () => {
  it("gives each category its own section", () => {
    setup(
      [
        category({ id: "exams", name: "Exams", weight: 60 }),
        category({ id: "hw", name: "Homework", weight: 40, position: 1 }),
      ],
      [],
    );
    expect(screen.getByRole("region", { name: "Exams" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Homework" })).toBeDefined();
  });

  it("shows what each category is worth", () => {
    setup([category({ id: "exams", name: "Exams", weight: 60 })], []);
    expect(
      within(screen.getByRole("region", { name: "Exams" })).getByText("60%"),
    ).toBeDefined();
  });

  it("says nothing is marked yet when nothing is", () => {
    setup([category({ id: "exams" })], [item({ categoryId: "exams" })]);
    expect(screen.getByText("nothing marked yet")).toBeDefined();
  });

  it("shows the category percentage once a score is in", () => {
    setup(
      [category({ id: "exams" })],
      [item({ categoryId: "exams", score: 88 })],
    );
    expect(screen.getByText("88%")).toBeDefined();
  });

  it("flags a category that drops its lowest", () => {
    setup([category({ id: "exams", dropLowest: 2 })], []);
    expect(screen.getByText("drops 2 lowest")).toBeDefined();
  });

  it("flags an extra credit category", () => {
    setup([category({ id: "bonus", name: "Bonus", extraCredit: true })], []);
    expect(screen.getByText("extra credit")).toBeDefined();
  });

  it("lists every item, marked or not", () => {
    setup(
      [category({ id: "exams" })],
      [
        item({ categoryId: "exams", title: "Midterm", score: 80 }),
        item({ categoryId: "exams", title: "Final" }),
      ],
    );
    expect(screen.getByText("Midterm")).toBeDefined();
    expect(screen.getByText("Final")).toBeDefined();
  });

  it("marks the item that is being dropped", () => {
    setup(
      [category({ id: "exams", dropLowest: 1 })],
      [
        item({ categoryId: "exams", title: "Quiz 1", score: 20 }),
        item({ categoryId: "exams", title: "Quiz 2", score: 90 }),
      ],
    );
    expect(screen.getByText("dropped")).toBeDefined();
  });

  it("says when an item came from the calendar", () => {
    setup(
      [category({ id: "exams" })],
      [item({ categoryId: "exams", eventId: "ev-1" })],
    );
    expect(screen.getByText("from Schedule")).toBeDefined();
  });

  it("shows a due date when there is one", () => {
    setup(
      [category({ id: "exams" })],
      [item({ categoryId: "exams", dueOn: "2026-10-01" })],
    );
    expect(screen.getByText(/Oct 1/)).toBeDefined();
  });

  it("leaves an unmarked score box empty rather than showing a zero", () => {
    setup([category({ id: "exams" })], [item({ categoryId: "exams" })]);
    expect(
      (screen.getByLabelText("Midterm score") as HTMLInputElement).value,
    ).toBe("");
  });

  it("shows what the item is out of", () => {
    setup(
      [category({ id: "exams" })],
      [item({ categoryId: "exams", maxScore: 50 })],
    );
    expect(screen.getByText("/ 50")).toBeDefined();
  });
});

describe("the grade table, editing", () => {
  it("reports a score that was typed in", () => {
    const { onScore } = setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm" })],
    );
    fireEvent.change(screen.getByLabelText("Midterm score"), {
      target: { value: "88" },
    });
    expect(onScore).toHaveBeenLastCalledWith("m1", 88);
  });

  it("reports a score with a decimal point", () => {
    const { onScore } = setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm" })],
    );
    fireEvent.change(screen.getByLabelText("Midterm score"), {
      target: { value: "88.5" },
    });
    expect(onScore).toHaveBeenLastCalledWith("m1", 88.5);
  });

  it("reports an emptied box as unmarked, not as a zero", async () => {
    const user = userEvent.setup();
    const { onScore } = setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm", score: 80 })],
    );
    await user.clear(screen.getByLabelText("Midterm score"));
    expect(onScore).toHaveBeenLastCalledWith("m1", null);
  });

  it("removes an item", async () => {
    const user = userEvent.setup();
    const { onRemove } = setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm" })],
    );
    await user.click(screen.getByRole("button", { name: "Remove Midterm" }));
    expect(onRemove).toHaveBeenCalledWith("m1");
  });
});

describe("the grade table, adding items", () => {
  it("opens a row for the right category", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    expect(screen.getByLabelText("Item name")).toBeDefined();
  });

  it("adds an item with no score yet", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.type(screen.getByLabelText("Item name"), "HW 3");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "HW 3",
      categoryId: "exams",
      courseId: "c1",
      score: null,
      maxScore: 100,
    });
  });

  it("takes the points it is out of", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.type(screen.getByLabelText("Item name"), "Quiz 1");
    const out = screen.getByLabelText("Out of");
    await user.clear(out);
    await user.type(out, "20");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave.mock.calls[0][0].maxScore).toBe(20);
  });

  it("takes a due date", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.type(screen.getByLabelText("Item name"), "Quiz 1");
    await user.type(screen.getByLabelText("Due date"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave.mock.calls[0][0].dueOn).toBe("2026-10-01");
  });

  it("refuses an item with no name", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("stays open so several items can be typed in a row", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.type(screen.getByLabelText("Item name"), "HW 1");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getByLabelText("Item name"), "HW 2");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("clears the box after each one", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.type(screen.getByLabelText("Item name"), "HW 1");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect((screen.getByLabelText("Item name") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("closes when it is done", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(
      screen.getByRole("button", { name: "Add item to Exams" }),
    );
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByLabelText("Item name")).toBeNull();
  });
});

describe("the grade table, order of the rows", () => {
  function titles(): string[] {
    return screen
      .getAllByRole("listitem")
      .map((row) => row.querySelector("span > span")?.textContent ?? "");
  }

  it("puts the soonest due date first", () => {
    setup(
      [category({ id: "exams" })],
      [
        item({ categoryId: "exams", title: "Later", dueOn: "2026-11-01" }),
        item({ categoryId: "exams", title: "Sooner", dueOn: "2026-10-01" }),
      ],
    );
    expect(titles()).toEqual(["Sooner", "Later"]);
  });

  it("falls back to alphabetical when two share a date", () => {
    setup(
      [category({ id: "exams" })],
      [
        item({ categoryId: "exams", title: "Beta", dueOn: "2026-10-01" }),
        item({ categoryId: "exams", title: "Alpha", dueOn: "2026-10-01" }),
      ],
    );
    expect(titles()).toEqual(["Alpha", "Beta"]);
  });

  it("leaves items with no date at the end", () => {
    setup(
      [category({ id: "exams" })],
      [
        item({ categoryId: "exams", title: "Undated" }),
        item({ categoryId: "exams", title: "Dated", dueOn: "2026-10-01" }),
      ],
    );
    expect(titles()).toEqual(["Dated", "Undated"]);
  });

  it("keeps a dropped item in date order rather than pushing it away", () => {
    setup(
      [category({ id: "exams", dropLowest: 1 })],
      [
        item({
          categoryId: "exams",
          title: "Bad one",
          score: 10,
          dueOn: "2026-10-01",
        }),
        item({
          categoryId: "exams",
          title: "Good one",
          score: 95,
          dueOn: "2026-11-01",
        }),
      ],
    );
    expect(titles()).toEqual(["Bad one", "Good one"]);
  });
});

describe("the grade table, fixing a mistake", () => {
  const rows = [
    item({
      id: "m1",
      categoryId: "exams",
      title: "Midterm",
      maxScore: 50,
      dueOn: "2026-10-01",
    }),
  ];

  it("opens an edit row from the pencil", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    expect((screen.getByLabelText("Item name") as HTMLInputElement).value).toBe(
      "Midterm",
    );
    expect((screen.getByLabelText("Out of") as HTMLInputElement).value).toBe(
      "50",
    );
    expect((screen.getByLabelText("Due date") as HTMLInputElement).value).toBe(
      "2026-10-01",
    );
  });

  it("fixes a name typed wrong", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.clear(screen.getByLabelText("Item name"));
    await user.type(screen.getByLabelText("Item name"), "Midterm 1");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      id: "m1",
      title: "Midterm 1",
    });
  });

  it("fixes the points it was out of", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.clear(screen.getByLabelText("Out of"));
    await user.type(screen.getByLabelText("Out of"), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave.mock.calls[0][0].maxScore).toBe(80);
  });

  it("fixes the date", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.clear(screen.getByLabelText("Due date"));
    await user.type(screen.getByLabelText("Due date"), "2026-11-05");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave.mock.calls[0][0].dueOn).toBe("2026-11-05");
  });

  it("keeps the score that was already entered", async () => {
    const user = userEvent.setup();
    const { onSave } = setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm", score: 44 })],
    );
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave.mock.calls[0][0].score).toBe(44);
  });

  it("refuses to save an empty name", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.clear(screen.getByLabelText("Item name"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("backs out without changing anything", async () => {
    const user = userEvent.setup();
    const { onSave } = setup([category({ id: "exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    await user.clear(screen.getByLabelText("Item name"));
    await user.type(screen.getByLabelText("Item name"), "Nope");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Midterm")).toBeDefined();
  });

  it("closes the add row when the pencil is used", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], rows);
    await user.click(screen.getByRole("button", { name: "Add item to Exams" }));
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });
});

describe("the grade table, fixing a category heading", () => {
  const cats = [
    category({ id: "exams", name: "Exmas", weight: 30, dropLowest: 1 }),
  ];

  it("opens the heading from its pencil", async () => {
    const user = userEvent.setup();
    setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    expect(
      (screen.getByLabelText("Category name") as HTMLInputElement).value,
    ).toBe("Exmas");
    expect(
      (screen.getByLabelText("Category weight") as HTMLInputElement).value,
    ).toBe("30");
    expect(
      (screen.getByLabelText("Category drop lowest") as HTMLInputElement).value,
    ).toBe("1");
  });

  it("fixes a name typed wrong", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    await user.clear(screen.getByLabelText("Category name"));
    await user.type(screen.getByLabelText("Category name"), "Exams");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveCategory.mock.calls[0][0]).toMatchObject({
      id: "exams",
      name: "Exams",
    });
  });

  it("fixes the weight", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    await user.clear(screen.getByLabelText("Category weight"));
    await user.type(screen.getByLabelText("Category weight"), "45");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveCategory.mock.calls[0][0].weight).toBe(45);
  });

  it("fixes how many are dropped", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    await user.clear(screen.getByLabelText("Category drop lowest"));
    await user.type(screen.getByLabelText("Category drop lowest"), "2");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveCategory.mock.calls[0][0].dropLowest).toBe(2);
  });

  it("keeps the extra credit flag it already had", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(
      [category({ id: "bonus", name: "Bonus", extraCredit: true })],
      [],
    );
    await user.click(screen.getByRole("button", { name: "Edit Bonus" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveCategory.mock.calls[0][0].extraCredit).toBe(true);
  });

  it("refuses an empty name", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    await user.clear(screen.getByLabelText("Category name"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveCategory).not.toHaveBeenCalled();
  });

  it("backs out without changing anything", async () => {
    const user = userEvent.setup();
    const { onSaveCategory } = setup(cats, []);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    await user.clear(screen.getByLabelText("Category name"));
    await user.type(screen.getByLabelText("Category name"), "Nope");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSaveCategory).not.toHaveBeenCalled();
    expect(screen.getByText("Exmas")).toBeDefined();
  });

  it("never throws away the items underneath", async () => {
    const user = userEvent.setup();
    setup(cats, [item({ categoryId: "exams", title: "Midterm" })]);
    await user.click(screen.getByRole("button", { name: "Edit Exmas" }));
    expect(screen.getByText("Midterm")).toBeDefined();
  });
});

describe("the grade table, knowing what you are typing into", () => {
  it("names the item being edited", async () => {
    const user = userEvent.setup();
    setup(
      [category({ id: "exams" })],
      [item({ id: "m1", categoryId: "exams", title: "Midterm" })],
    );
    await user.click(screen.getByRole("button", { name: "Edit Midterm" }));
    expect(screen.getByText(/Editing/)).toBeDefined();
    expect(screen.getAllByText("Midterm").length).toBeGreaterThan(0);
  });

  it("names the category a new item is going into", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(screen.getByRole("button", { name: "Add item to Exams" }));
    expect(screen.getByText(/New item in/)).toBeDefined();
  });

  it("captions every box it asks you to fill", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(screen.getByRole("button", { name: "Add item to Exams" }));
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Out of")).toBeDefined();
    expect(screen.getByText("Due")).toBeDefined();
  });

  it("captions the category boxes too", async () => {
    const user = userEvent.setup();
    setup([category({ id: "exams", name: "Exams" })], []);
    await user.click(screen.getByRole("button", { name: "Edit Exams" }));
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Worth %")).toBeDefined();
    expect(screen.getByText("Drop lowest")).toBeDefined();
  });

  it("keeps the add button reading as one action", () => {
    setup([category({ id: "exams", name: "Exams" })], []);
    expect(
      screen.getByRole("button", { name: "Add item to Exams" }),
    ).toBeDefined();
  });
});
