import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditScope, LifeEvent } from "@lifeos/contracts";
import { EventForm } from "@/components/event-form";

function local(day: string, hour = 9, minute = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

type Saved = { event: LifeEvent; scope: EditScope };

function setup(
  props: Partial<React.ComponentProps<typeof EventForm>> = {},
): {
  saved: Saved[];
  deleted: Saved[];
  cancelled: () => number;
} {
  const saved: Saved[] = [];
  const deleted: Saved[] = [];
  const onCancel = vi.fn();

  render(
    <EventForm
      editing={null}
      initialRange={{
        start: local("2026-03-02", 9),
        end: local("2026-03-02", 10),
        allDay: false,
      }}
      userId="u1"
      onSave={(event, scope) => saved.push({ event, scope })}
      onDelete={(event, scope) => deleted.push({ event, scope })}
      onCancel={onCancel}
      {...props}
    />,
  );

  return { saved, deleted, cancelled: () => onCancel.mock.calls.length };
}

function occurrence(over: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: "s1::2026-03-16",
    userId: "u1",
    type: "general",
    title: "Gym",
    start: local("2026-03-16", 9),
    end: local("2026-03-16", 10),
    seriesId: "s1",
    occurrenceDate: "2026-03-16",
    recurrence: { freq: "weekly", interval: 1 },
    ...over,
  } as LifeEvent;
}

describe("the form, basics", () => {
  it("says New event when nothing is being edited", () => {
    setup();
    expect(screen.getByText("New event")).toBeDefined();
  });

  it("says Edit event when something is", () => {
    setup({ editing: occurrence() });
    expect(screen.getByText("Edit event")).toBeDefined();
  });

  it("fills the times from the range that was dragged", () => {
    setup();
    const start = screen.getByLabelText("Start") as HTMLInputElement;
    expect(start.value).toBe("2026-03-02T09:00");
    expect(start.type).toBe("datetime-local");
  });

  it("stops the end from being set before the start", () => {
    setup();
    const start = screen.getByLabelText("Start") as HTMLInputElement;
    const end = screen.getByLabelText("End") as HTMLInputElement;
    expect(end.min).toBe(start.value);
  });

  it("lets notes take more than one line", () => {
    setup();
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
  });

  it("calls back when cancelled", async () => {
    const user = userEvent.setup();
    const { cancelled } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelled()).toBe(1);
  });
});

describe("the form, saving", () => {
  it("builds a general event out of the draft", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Coffee");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saved).toHaveLength(1);
    expect(saved[0].scope).toBe("one");
    expect(saved[0].event).toMatchObject({
      type: "general",
      title: "Coffee",
      userId: "u1",
      start: local("2026-03-02", 9),
      end: local("2026-03-02", 10),
    });
  });

  it("leaves the default colour off the event", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Coffee");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect("color" in saved[0].event).toBe(false);
  });

  it("stores a colour once one is chosen", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Coffee");
    await user.click(screen.getByRole("button", { name: "pink" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event.color).toBe("pink");
  });

  it("keeps the notes, newlines and all", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Coffee");
    await user.type(screen.getByLabelText("Notes"), "one{Enter}two");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event.notes).toBe("one\ntwo");
  });
});

describe("the form, event types", () => {
  it("asks for a place and an amount when dining", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Type"), "dining");
    expect(screen.getByLabelText("Place")).toBeDefined();
    expect(screen.getByLabelText("Amount")).toBeDefined();
  });

  it("asks for a course and a maximum score when it is an exam", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Type"), "exam");
    expect(screen.getByLabelText("Course")).toBeDefined();
    expect(screen.getByLabelText("Max score")).toBeDefined();
  });

  it("puts the extra fields on the saved event as numbers", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.selectOptions(screen.getByLabelText("Type"), "dining");
    await user.type(screen.getByLabelText("Title"), "Lunch");
    await user.type(screen.getByLabelText("Place"), "Pho 24");
    await user.type(screen.getByLabelText("Amount"), "12.5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event).toMatchObject({
      type: "dining",
      place: "Pho 24",
      amount: 12.5,
    });
  });

  it("reads the extra fields back when editing", () => {
    setup({
      editing: {
        id: "e1",
        userId: "u1",
        type: "gym",
        title: "Legs",
        start: local("2026-03-02", 9),
        end: local("2026-03-02", 10),
        workout: "Squats",
        calories: 400,
      } as LifeEvent,
    });
    expect((screen.getByLabelText("Workout") as HTMLInputElement).value).toBe(
      "Squats",
    );
    expect((screen.getByLabelText("Calories") as HTMLInputElement).value).toBe(
      "400",
    );
  });
});

describe("the form, all day events", () => {
  it("switches the inputs to plain dates", () => {
    setup({
      initialRange: {
        start: "2026-03-02",
        end: "2026-03-03",
        allDay: true,
      },
    });
    const start = screen.getByLabelText("Start") as HTMLInputElement;
    expect(start.type).toBe("date");
    expect(start.value).toBe("2026-03-02");
  });

  it("shows the day the event happens, not the exclusive end", () => {
    setup({
      initialRange: {
        start: "2026-03-02",
        end: "2026-03-03",
        allDay: true,
      },
    });
    expect((screen.getByLabelText("End") as HTMLInputElement).value).toBe(
      "2026-03-02",
    );
  });

  it("puts the exclusive end back when saving", async () => {
    const user = userEvent.setup();
    const { saved } = setup({
      initialRange: {
        start: "2026-03-02",
        end: "2026-03-03",
        allDay: true,
      },
    });
    await user.type(screen.getByLabelText("Title"), "Birthday");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event).toMatchObject({
      allDay: true,
      start: "2026-03-02",
      end: "2026-03-03",
    });
  });
});

describe("the form, repeating", () => {
  it("starts on Does not repeat", () => {
    setup();
    expect((screen.getByLabelText("Repeat") as HTMLSelectElement).value).toBe(
      "none",
    );
  });

  it("reveals the interval and the end date once it repeats", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Repeat"), "weekly");
    expect(screen.getByLabelText("Every")).toBeDefined();
    expect(screen.getByLabelText("Until (blank = forever)")).toBeDefined();
  });

  it("refuses an interval below one", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Repeat"), "weekly");
    expect((screen.getByLabelText("Every") as HTMLInputElement).min).toBe("1");
  });

  it("puts the rule on the saved event", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Gym");
    await user.selectOptions(screen.getByLabelText("Repeat"), "weekly");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event.recurrence).toMatchObject({
      freq: "weekly",
      interval: 1,
    });
    expect(saved[0].event.seriesId).toBe(saved[0].event.id);
  });

  it("carries the until date into the rule", async () => {
    const user = userEvent.setup();
    const { saved } = setup();
    await user.type(screen.getByLabelText("Title"), "Gym");
    await user.selectOptions(screen.getByLabelText("Repeat"), "weekly");
    await user.type(
      screen.getByLabelText("Until (blank = forever)"),
      "2026-12-31",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0].event.recurrence?.until).toBe("2026-12-31");
  });

  it("shows the rule again when a repeating event is edited", () => {
    setup({ editing: occurrence() });
    expect((screen.getByLabelText("Repeat") as HTMLSelectElement).value).toBe(
      "weekly",
    );
  });
});

describe("the form, custom repeat", () => {
  async function openCustom() {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Repeat"), "custom-open");
    return user;
  }

  it("opens a panel of weekdays", async () => {
    await openCustom();
    expect(screen.getByText("Custom repeat")).toBeDefined();
    expect(screen.getByText("Repeat on")).toBeDefined();
  });

  it("turns a weekday on when it is clicked", async () => {
    const user = await openCustom();
    const monday = screen.getAllByRole("button", { name: "M" })[0];
    await user.click(monday);
    expect(monday.getAttribute("aria-pressed")).toBe("true");
  });

  it("goes back to the form with a summary of the choice", async () => {
    const user = await openCustom();
    await user.click(screen.getAllByRole("button", { name: "M" })[0]);
    await user.click(screen.getByRole("button", { name: "Done" }));
    const repeat = screen.getByLabelText("Repeat") as HTMLSelectElement;
    expect(repeat.value).toBe("custom");
    expect(repeat.selectedOptions[0].textContent).toContain("Mon");
  });

  it("reopens the panel with the earlier days still chosen", async () => {
    const user = await openCustom();
    await user.click(screen.getAllByRole("button", { name: "M" })[0]);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.selectOptions(screen.getByLabelText("Repeat"), "custom-open");
    expect(
      screen.getAllByRole("button", { name: "M" })[0].getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("saves custom as a weekly rule with the chosen days", async () => {
    const user = await openCustom();
    await user.click(screen.getAllByRole("button", { name: "M" })[0]);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.type(screen.getByLabelText("Title"), "Gym");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Custom repeat")).toBeNull();
  });

  it("falls back to no repeat when every day is switched off", async () => {
    const user = await openCustom();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect((screen.getByLabelText("Repeat") as HTMLSelectElement).value).toBe(
      "none",
    );
  });

  it("leaves the choice untouched when the panel is cancelled", async () => {
    const user = await openCustom();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect((screen.getByLabelText("Repeat") as HTMLSelectElement).value).toBe(
      "none",
    );
  });

  it("keeps the chosen weekdays when a custom event is reopened", () => {
    setup({
      editing: occurrence({
        recurrence: { freq: "weekly", interval: 1, byDay: [1, 3] },
      }),
    });
    const repeat = screen.getByLabelText("Repeat") as HTMLSelectElement;
    expect(repeat.value).toBe("custom");
    expect(repeat.selectedOptions[0].textContent).toContain("Wed");
  });
});

describe("the form, choosing a scope", () => {
  it("asks before saving a change to a repeating event", async () => {
    const user = userEvent.setup();
    const { saved } = setup({ editing: occurrence() });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Save changes to")).toBeDefined();
    expect(saved).toHaveLength(0);
  });

  it("saves with the scope that was picked", async () => {
    const user = userEvent.setup();
    const { saved } = setup({ editing: occurrence() });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "All events" }));
    expect(saved[0].scope).toBe("all");
    expect(saved[0].event.occurrenceDate).toBe("2026-03-16");
  });

  it("goes back to the form when the question is cancelled", async () => {
    const user = userEvent.setup();
    const { saved } = setup({ editing: occurrence() });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Edit event")).toBeDefined();
    expect(saved).toHaveLength(0);
  });

  it("asks before deleting a repeating event", async () => {
    const user = userEvent.setup();
    const { deleted } = setup({ editing: occurrence() });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete repeating event")).toBeDefined();
    expect(deleted).toHaveLength(0);
  });

  it("deletes with the scope that was picked", async () => {
    const user = userEvent.setup();
    const { deleted } = setup({ editing: occurrence() });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(
      screen.getByRole("button", { name: "This and following events" }),
    );
    expect(deleted[0].scope).toBe("following");
  });

  it("does not ask for an event that does not repeat", async () => {
    const user = userEvent.setup();
    const { deleted } = setup({
      editing: {
        id: "e1",
        userId: "u1",
        type: "general",
        title: "Coffee",
        start: local("2026-03-02", 9),
        end: local("2026-03-02", 10),
      } as LifeEvent,
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleted).toEqual([{ event: expect.anything(), scope: "one" }]);
  });

  it("opens straight on the delete question when asked to", () => {
    setup({ editing: occurrence(), initialAsk: "delete" });
    expect(screen.getByText("Delete repeating event")).toBeDefined();
  });

  it("offers no delete button for a brand new event", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});
