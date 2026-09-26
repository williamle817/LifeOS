import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Semester } from "@lifeos/contracts";
import { SemesterBar } from "@/modules/academic/components/semester-bar";

function semester(id: string, name: string, startsOn: string): Semester {
  return { id, userId: "u1", name, startsOn };
}

function setup(semesters: Semester[], selected: string | null = null) {
  const onSelect = vi.fn();
  const onAdd = vi.fn();
  const onDelete = vi.fn();
  const onSave = vi.fn();
  render(
    <SemesterBar
      semesters={semesters}
      selected={selected}
      onSelect={onSelect}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
    />,
  );
  return { onSelect, onAdd, onSave, onDelete };
}

describe("the semester bar", () => {
  it("offers a way in when there is nothing yet", () => {
    setup([]);
    expect(screen.getByRole("button", { name: "New semester" })).toBeDefined();
    expect(screen.queryByLabelText("Semester")).toBeNull();
  });

  it("lists the semesters once they exist", () => {
    setup(
      [
        semester("fall", "Fall 2026", "2026-08-20"),
        semester("spring", "Spring 2026", "2026-01-10"),
      ],
      "fall",
    );
    const picker = screen.getByLabelText("Semester") as HTMLSelectElement;
    expect([...picker.options].map((o) => o.textContent)).toEqual([
      "Fall 2026",
      "Spring 2026",
    ]);
  });

  it("puts the newest term first", () => {
    setup(
      [
        semester("spring", "Spring 2026", "2026-01-10"),
        semester("fall", "Fall 2026", "2026-08-20"),
      ],
      "fall",
    );
    const picker = screen.getByLabelText("Semester") as HTMLSelectElement;
    expect(picker.options[0].textContent).toBe("Fall 2026");
  });

  it("shows which one is open", () => {
    setup(
      [
        semester("fall", "Fall 2026", "2026-08-20"),
        semester("spring", "Spring 2026", "2026-01-10"),
      ],
      "spring",
    );
    expect((screen.getByLabelText("Semester") as HTMLSelectElement).value).toBe(
      "spring",
    );
  });

  it("reports a change of semester", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup(
      [
        semester("fall", "Fall 2026", "2026-08-20"),
        semester("spring", "Spring 2026", "2026-01-10"),
      ],
      "fall",
    );
    await user.selectOptions(screen.getByLabelText("Semester"), "spring");
    expect(onSelect).toHaveBeenCalledWith("spring");
  });

  it("asks for a name and a start date", async () => {
    const user = userEvent.setup();
    setup([]);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    expect(screen.getByLabelText("Semester name")).toBeDefined();
    expect(screen.getByLabelText("Starts on")).toBeDefined();
  });

  it("starts the date on today", async () => {
    const user = userEvent.setup();
    setup([]);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    const today = new Date().toISOString().slice(0, 10);
    expect((screen.getByLabelText("Starts on") as HTMLInputElement).value).toBe(
      today,
    );
  });

  it("adds one", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup([]);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    await user.type(screen.getByLabelText("Semester name"), "Fall 2026");
    await user.clear(screen.getByLabelText("Starts on"));
    await user.type(screen.getByLabelText("Starts on"), "2026-08-20");
    await user.click(screen.getByRole("button", { name: "Add semester" }));
    expect(onAdd).toHaveBeenCalledWith("Fall 2026", "2026-08-20");
  });

  it("refuses a semester with no name", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup([]);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    await user.click(screen.getByRole("button", { name: "Add semester" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("backs out of adding", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup([]);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "New semester" })).toBeDefined();
  });

  it("asks before deleting the one that is open", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Delete Fall 2026?")).toBeDefined();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("goes ahead when the red button is pressed", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    const dialog = screen.getByRole("dialog");
    const go = [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent === "Delete semester",
    )!;
    await user.click(go);
    expect(onDelete).toHaveBeenCalledWith("fall");
  });

  it("backs out of deleting", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("warns that everything under it goes too", async () => {
    const user = userEvent.setup();
    setup([semester("fall", "Fall 2026", "2026-08-20")], "fall");
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    expect(screen.getByText(/cannot be undone/)).toBeDefined();
  });

  it("offers no delete when nothing is open", () => {
    setup([]);
    expect(screen.queryByRole("button", { name: "Delete semester" })).toBeNull();
  });
});

describe("fixing a semester", () => {
  it("opens the name and the date from its pencil", async () => {
    const user = userEvent.setup();
    setup([semester("fall", "Fal 2026", "2026-08-20")], "fall");
    await user.click(screen.getByRole("button", { name: "Edit Fal 2026" }));
    expect(
      (screen.getByLabelText("Semester name") as HTMLInputElement).value,
    ).toBe("Fal 2026");
    expect((screen.getByLabelText("Starts on") as HTMLInputElement).value).toBe(
      "2026-08-20",
    );
  });

  it("fixes a name typed wrong", async () => {
    const user = userEvent.setup();
    const { onSave } = setup(
      [semester("fall", "Fal 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Edit Fal 2026" }));
    await user.clear(screen.getByLabelText("Semester name"));
    await user.type(screen.getByLabelText("Semester name"), "Fall 2026");
    await user.click(screen.getByRole("button", { name: "Save semester" }));
    expect(onSave).toHaveBeenCalledWith({
      id: "fall",
      userId: "u1",
      name: "Fall 2026",
      startsOn: "2026-08-20",
    });
  });

  it("fixes a start date picked wrong", async () => {
    const user = userEvent.setup();
    const { onSave } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Edit Fall 2026" }));
    await user.clear(screen.getByLabelText("Starts on"));
    await user.type(screen.getByLabelText("Starts on"), "2026-09-01");
    await user.click(screen.getByRole("button", { name: "Save semester" }));
    expect(onSave.mock.calls[0][0].startsOn).toBe("2026-09-01");
  });

  it("adds nothing while editing", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Edit Fall 2026" }));
    await user.click(screen.getByRole("button", { name: "Save semester" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("backs out without changing anything", async () => {
    const user = userEvent.setup();
    const { onSave } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Edit Fall 2026" }));
    await user.clear(screen.getByLabelText("Semester name"));
    await user.type(screen.getByLabelText("Semester name"), "Nope");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Semester")).toBeDefined();
  });

  it("offers no pencil before a semester exists", () => {
    setup([]);
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
  });
});
