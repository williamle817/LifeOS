import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Flow } from "@lifeos/contracts";
import { FlowPanel } from "@/modules/finance/components/flow-panel";
import { inMonth, type Month } from "@/modules/finance/lib/month";

const MARCH: Month = { year: 2026, month: 2 };

let seq = 0;

function flow(over: Partial<Flow> = {}): Flow {
  seq += 1;
  return {
    id: `f-${seq}`,
    userId: "u1",
    kind: "expense",
    title: "Groceries",
    on: "2026-03-10",
    amount: 40,
    repeat: "once",
    ...over,
  };
}

function setup(flows: Flow[], kind: Flow["kind"] = "expense") {
  const onSave = vi.fn();
  const onRemove = vi.fn();
  const onMove = vi.fn();
  render(
    <FlowPanel
      kind={kind}
      rows={inMonth(flows, MARCH)}
      userId="u1"
      month={MARCH}
      onSave={onSave}
      onRemove={onRemove}
      onMove={onMove}
    />,
  );
  return { onSave, onRemove, onMove };
}

describe("the panel of entries", () => {
  it("names the side it is showing", () => {
    setup([], "income");
    expect(screen.getByRole("heading", { name: "Income" })).toBeTruthy();
  });

  it("says so when the month is empty", () => {
    setup([]);
    expect(screen.getByText(/Nothing in expenses this month/)).toBeTruthy();
  });

  it("adds up what the month holds", () => {
    setup([flow({ amount: 40 }), flow({ amount: 2.5 })]);
    const panel = screen.getByRole("region", { name: "Expenses" });
    expect(within(panel).getByText("$42.50")).toBeTruthy();
  });

  it("shows an expense as money going out", () => {
    setup([flow({ amount: 40 })]);
    expect(screen.getByText("-$40.00")).toBeTruthy();
  });

  it("shows income as money coming in", () => {
    setup([flow({ kind: "income", amount: 120 })], "income");
    expect(screen.getByText("+$120.00")).toBeTruthy();
  });

  it("puts the date, the place and the repeat under the name", () => {
    setup([
      flow({ place: "The market", repeat: "monthly", on: "2026-03-04" }),
    ]);
    expect(
      screen.getByText("Mar 4 · The market · Every month"),
    ).toBeTruthy();
  });

  it("says nothing about a repeat on a one off", () => {
    setup([flow({ on: "2026-03-04" })]);
    expect(screen.getByText("Mar 4")).toBeTruthy();
  });

  it("shows a repeating entry on the day it lands this month", () => {
    setup([flow({ on: "2026-01-31", repeat: "monthly" })]);
    expect(screen.getByText(/Mar 31/)).toBeTruthy();
  });
});

describe("adding an entry", () => {
  it("opens the form from the add button", async () => {
    setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(screen.getByLabelText("Expenses name")).toBeTruthy();
  });

  it("starts the date in the month being looked at", async () => {
    setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(
      (screen.getByLabelText("Expenses date") as HTMLInputElement).value,
    ).toBe("2026-03-01");
  });

  it("hands back what was typed", async () => {
    const { onSave } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Rent");
    await userEvent.type(screen.getByLabelText("Expenses location"), "Home");
    await userEvent.clear(screen.getByLabelText("Expenses amount"));
    await userEvent.type(screen.getByLabelText("Expenses amount"), "800");
    await userEvent.selectOptions(
      screen.getByLabelText("Expenses repeats"),
      "monthly",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "expense",
        title: "Rent",
        place: "Home",
        amount: 800,
        repeat: "monthly",
        on: "2026-03-01",
      }),
    );
  });

  it("refuses an entry with no name", async () => {
    const { onSave } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses amount"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("leaves the location off when it was not filled in", async () => {
    const { onSave } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Bus fare");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave.mock.calls[0][0].place).toBeUndefined();
  });

  it("reads an empty amount as nothing, not as text", async () => {
    const { onSave } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Bus fare");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave.mock.calls[0][0].amount).toBe(0);
  });

  it("stays open for the next entry and keeps the date", async () => {
    setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.clear(screen.getByLabelText("Expenses date"));
    await userEvent.type(screen.getByLabelText("Expenses date"), "2026-03-14");
    await userEvent.type(screen.getByLabelText("Expenses name"), "Coffee");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect((screen.getByLabelText("Expenses name") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Expenses date") as HTMLInputElement).value).toBe(
      "2026-03-14",
    );
  });
});

describe("changing an entry", () => {
  it("says which entry is being edited", async () => {
    setup([flow({ title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Groceries" }),
    );
    expect(screen.getByText(/Editing/)).toBeTruthy();
  });

  it("fills the form with what the entry holds", async () => {
    setup([
      flow({
        title: "Groceries",
        place: "The market",
        amount: 40,
        repeat: "monthly",
        on: "2026-03-10",
      }),
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Groceries" }),
    );
    expect(
      (screen.getByLabelText("Expenses name") as HTMLInputElement).value,
    ).toBe("Groceries");
    expect(
      (screen.getByLabelText("Expenses location") as HTMLInputElement).value,
    ).toBe("The market");
    expect(
      (screen.getByLabelText("Expenses amount") as HTMLInputElement).value,
    ).toBe("40");
    expect(
      (screen.getByLabelText("Expenses repeats") as HTMLSelectElement).value,
    ).toBe("monthly");
  });

  it("edits the day the series starts, not the day it landed", async () => {
    setup([flow({ title: "Rent", on: "2026-01-31", repeat: "monthly" })]);
    await userEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    expect(
      (screen.getByLabelText("Expenses date") as HTMLInputElement).value,
    ).toBe("2026-01-31");
  });

  it("keeps the same entry rather than making a second one", async () => {
    const { onSave } = setup([flow({ id: "keep", title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Groceries" }),
    );
    await userEvent.clear(screen.getByLabelText("Expenses name"));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Food");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: "keep", title: "Food" }),
    );
  });

  it("drops out of the form on cancel without saving", async () => {
    const { onSave } = setup([flow({ title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Groceries" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByText(/Editing/)).toBeNull();
  });

  it("removes an entry", async () => {
    const { onRemove } = setup([flow({ id: "gone", title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Groceries" }),
    );
    expect(onRemove).toHaveBeenCalledWith("gone");
  });

  it("offers a drag handle on every row", () => {
    setup([flow({ title: "Groceries" })]);
    expect(document.querySelector('[data-reorder="Groceries"]')).not.toBeNull();
  });
});
