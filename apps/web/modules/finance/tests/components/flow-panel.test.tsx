import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Flow } from "@lifeos/contracts";
import { FlowPanel } from "@/modules/finance/components/flow-panel";
import {
  inMonth,
  type Dated,
  type Month,
} from "@/modules/finance/lib/month";

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

function setupRows(rows: Dated[], kind: Flow["kind"] = "expense") {
  const onAdd = vi.fn();
  const onSave = vi.fn();
  const onRemove = vi.fn();
  const onMove = vi.fn();
  render(
    <FlowPanel
      kind={kind}
      rows={rows}
      userId="u1"
      month={MARCH}
      onAdd={onAdd}
      onSave={onSave}
      onRemove={onRemove}
      onMove={onMove}
    />,
  );
  return { onAdd, onSave, onRemove, onMove };
}

function setup(flows: Flow[], kind: Flow["kind"] = "expense") {
  const onAdd = vi.fn();
  const onSave = vi.fn();
  const onRemove = vi.fn();
  const onMove = vi.fn();
  render(
    <FlowPanel
      kind={kind}
      rows={inMonth(flows, MARCH)}
      userId="u1"
      month={MARCH}
      onAdd={onAdd}
      onSave={onSave}
      onRemove={onRemove}
      onMove={onMove}
    />,
  );
  return { onAdd, onSave, onRemove, onMove };
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
    const { onAdd } = setup([]);
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

    expect(onAdd).toHaveBeenCalledWith(
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
    const { onAdd } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses amount"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("leaves the location off when it was not filled in", async () => {
    const { onAdd } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Bus fare");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd.mock.calls[0][0].place).toBeUndefined();
  });

  it("reads an empty amount as nothing, not as text", async () => {
    const { onAdd } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Bus fare");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd.mock.calls[0][0].amount).toBe(0);
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

  it("edits the day this occurrence landed on", async () => {
    setup([flow({ title: "Rent", on: "2026-01-31", repeat: "monthly" })]);
    await userEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    expect(
      (screen.getByLabelText("Expenses date") as HTMLInputElement).value,
    ).toBe("2026-03-31");
  });

  it("hands back the entry, its date and the new values", async () => {
    const { onSave } = setup([flow({ id: "keep", title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Groceries" }),
    );
    await userEvent.clear(screen.getByLabelText("Expenses name"));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Food");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [original, on, next, scope] = onSave.mock.calls[0];
    expect(original.id).toBe("keep");
    expect(on).toBe("2026-03-10");
    expect(next.title).toBe("Food");
    expect(scope).toBeNull();
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

  it("removes a one off without asking anything", async () => {
    const { onRemove } = setup([flow({ id: "gone", title: "Groceries" })]);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Groceries" }),
    );
    const [gone, on, scope] = onRemove.mock.calls[0];
    expect(gone.id).toBe("gone");
    expect(on).toBe("2026-03-10");
    expect(scope).toBeNull();
  });

  it("offers a drag handle on every row", () => {
    setup([flow({ title: "Groceries" })]);
    expect(document.querySelector('[data-reorder="Groceries"]')).not.toBeNull();
  });
});

describe("what an expense is for", () => {
  it("offers a type on an expense", async () => {
    setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(screen.getByLabelText("Expenses type")).toBeTruthy();
  });

  it("asks income what it is too, from its own list", async () => {
    setup([], "income");
    await userEvent.click(screen.getByRole("button", { name: "Add income" }));
    const type = screen.getByLabelText("Income type") as HTMLSelectElement;
    const options = [...type.options].map((one) => one.text);
    expect(options).toContain("Paycheck");
    expect(options).toContain("Gift");
    expect(options).not.toContain("Groceries");
  });

  it("leaves the type not set to start with", async () => {
    setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const type = screen.getByLabelText("Expenses type") as HTMLSelectElement;
    expect(type.value).toBe("");
    expect(type.options[0].text).toBe("Not set");
  });

  it("saves the type that was picked", async () => {
    const { onAdd } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Netflix");
    await userEvent.selectOptions(
      screen.getByLabelText("Expenses type"),
      "Subscription",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd.mock.calls[0][0].category).toBe("Subscription");
  });

  it("leaves the type off when it was not picked", async () => {
    const { onAdd } = setup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Expenses name"), "Bus fare");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd.mock.calls[0][0].category).toBeUndefined();
  });

  it("shows the type under the name", () => {
    setup([flow({ category: "Groceries", on: "2026-03-04" })]);
    expect(screen.getByText(/Mar 4 · Groceries/)).toBeTruthy();
  });

  it("fills the type back in when the entry is edited", async () => {
    setup([flow({ title: "Netflix", category: "Subscription" })]);
    await userEvent.click(screen.getByRole("button", { name: "Edit Netflix" }));
    expect(
      (screen.getByLabelText("Expenses type") as HTMLSelectElement).value,
    ).toBe("Subscription");
  });
});

describe("touching a repeating entry", () => {
  const rent = () =>
    flow({
      id: "rent",
      title: "Rent",
      on: "2026-01-05",
      repeat: "monthly",
      amount: 650,
    });

  it("asks which entries before removing one", async () => {
    const { onRemove } = setup([rent()]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Apply to" })).toBeTruthy();
  });

  it("offers the same three choices the calendar offers", async () => {
    setup([rent()]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    const panel = screen.getByRole("dialog", { name: "Apply to" });
    expect(within(panel).getByText("This entry")).toBeTruthy();
    expect(within(panel).getByText("This and following entries")).toBeTruthy();
    expect(within(panel).getByText("All entries")).toBeTruthy();
  });

  it("removes with the scope that was picked, at the right date", async () => {
    const { onRemove } = setup([rent()]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    await userEvent.click(screen.getByText("This and following entries"));
    const [one, on, scope] = onRemove.mock.calls[0];
    expect(one.id).toBe("rent");
    expect(on).toBe("2026-03-05");
    expect(scope).toBe("following");
  });

  it("does nothing when the question is cancelled", async () => {
    const { onRemove } = setup([rent()]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks the same question when saving an edit", async () => {
    const { onSave } = setup([rent()]);
    await userEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    await userEvent.clear(screen.getByLabelText("Expenses amount"));
    await userEvent.type(screen.getByLabelText("Expenses amount"), "700");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("This entry"));

    const [one, on, next, scope] = onSave.mock.calls[0];
    expect(one.id).toBe("rent");
    expect(on).toBe("2026-03-05");
    expect(next.amount).toBe(700);
    expect(scope).toBe("one");
  });

  it("keeps the owner of the entry it is editing", async () => {
    const { onSave } = setup([{ ...rent(), userId: "someone" }]);
    await userEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByText("All entries"));
    expect(onSave.mock.calls[0][2].userId).toBe("someone");
  });
});

describe("a row that came from the calendar", () => {
  const paid = (over: Partial<Flow> = {}): Flow =>
    flow({
      id: "shift-e1",
      kind: "income",
      title: "Working shift",
      place: "The cafe",
      category: "Work",
      amount: 115,
      eventId: "e1",
      ...over,
    });

  const row = (over: Partial<Dated> = {}): Dated => ({
    flow: paid(),
    on: "2026-03-04",
    ...over,
  });

  it("says where it came from, filed under Work", () => {
    setupRows([row()], "income");
    expect(screen.getByText(/Work \u00b7 The cafe \u00b7 from Schedule/)).toBeTruthy();
  });

  it("counts toward the total like any other income", () => {
    setupRows([row()], "income");
    const panel = screen.getByRole("region", { name: "Income" });
    expect(within(panel).getByText("$115.00")).toBeTruthy();
  });

  it("offers a pencil and a bin", () => {
    setupRows([row()], "income");
    expect(
      screen.getByRole("button", { name: "Edit Working shift" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove Working shift" }),
    ).toBeTruthy();
  });

  it("offers no drag handle, because there is no row to renumber", () => {
    setupRows([row()], "income");
    expect(document.querySelector('[data-reorder="Working shift"]')).toBeNull();
  });

  it("only edits the name and the location", async () => {
    setupRows([row()], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Working shift" }),
    );
    expect(screen.getByLabelText("Income name")).toBeTruthy();
    expect(screen.getByLabelText("Income location")).toBeTruthy();
    expect(screen.queryByLabelText("Income type")).toBeNull();
    expect(screen.queryByLabelText("Income date")).toBeNull();
    expect(screen.queryByLabelText("Income amount")).toBeNull();
    expect(screen.queryByLabelText("Income repeats")).toBeNull();
  });

  it("warns that the change lands in Schedule", async () => {
    setupRows([row()], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Working shift" }),
    );
    expect(screen.getByText(/changes in Schedule/)).toBeTruthy();
  });

  it("saves a one off shift without asking anything", async () => {
    const { onSave } = setupRows([row()], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Working shift" }),
    );
    await userEvent.clear(screen.getByLabelText("Income location"));
    await userEvent.type(screen.getByLabelText("Income location"), "The bar");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [one, on, next, scope] = onSave.mock.calls[0];
    expect(one.eventId).toBe("e1");
    expect(on).toBe("2026-03-04");
    expect(next.place).toBe("The bar");
    expect(scope).toBeNull();
  });

  it("removes a one off shift without asking anything", async () => {
    const { onRemove } = setupRows([row()], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Working shift" }),
    );
    expect(onRemove.mock.calls[0][2]).toBeNull();
  });

  it("asks which shifts when the shift repeats", async () => {
    const { onRemove } = setupRows([row({ series: true })], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Working shift" }),
    );
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("All entries"));
    expect(onRemove.mock.calls[0][2]).toBe("all");
  });

  it("asks the same question when saving a repeating shift", async () => {
    const { onSave } = setupRows([row({ series: true })], "income");
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Working shift" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("This entry"));
    expect(onSave.mock.calls[0][3]).toBe("one");
  });

  it("leaves an entry typed in here alone", () => {
    setup([flow({ kind: "income", title: "Tutoring" })], "income");
    expect(screen.getByRole("button", { name: "Edit Tutoring" })).toBeTruthy();
    expect(document.querySelector('[data-reorder="Tutoring"]')).not.toBeNull();
  });
});
