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
  render(
    <SemesterBar
      semesters={semesters}
      selected={selected}
      onSelect={onSelect}
      onAdd={onAdd}
      onDelete={onDelete}
    />,
  );
  return { onSelect, onAdd, onDelete };
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

  it("deletes the one that is open", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup(
      [semester("fall", "Fall 2026", "2026-08-20")],
      "fall",
    );
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    expect(onDelete).toHaveBeenCalledWith("fall");
  });

  it("offers no delete when nothing is open", () => {
    setup([]);
    expect(screen.queryByRole("button", { name: "Delete semester" })).toBeNull();
  });
});
