import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditScope, LifeEvent } from "@lifeos/contracts";

const saved: Array<{ event: LifeEvent; scope: EditScope }> = [];
const removed: Array<{ event: LifeEvent; scope: EditScope }> = [];
const undone = vi.fn();

let rows: LifeEvent[] = [];
let error: string | null = null;

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

vi.mock("@/modules/schedule/lib/event-store", () => ({
  subscribe: () => () => {},
  getSnapshot: () => rows,
  getServerSnapshot: () => rows,
  currentUserId: () => "u1",
  lastWriteError: () => error,
  canUndo: () => true,
  undo: async () => {
    undone();
  },
  ensureLoaded: async () => {},
  updateEvent: async () => {},
  deleteEvent: async () => {},
  saveOccurrence: async (event: LifeEvent, scope: EditScope) => {
    saved.push({ event, scope });
  },
  removeOccurrence: async (event: LifeEvent, scope: EditScope) => {
    removed.push({ event, scope });
  },
}));

const { ScheduleView } = await import("@/modules/schedule/components/schedule-view");

function today(hour: number): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
  ).toISOString();
}

function plain(over: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: "e1",
    userId: "u1",
    type: "general",
    title: "Coffee",
    start: today(9),
    end: today(10),
    ...over,
  } as LifeEvent;
}

beforeEach(() => {
  saved.length = 0;
  removed.length = 0;
  undone.mockClear();
  rows = [];
  error = null;
});

describe("the calendar shell", () => {
  it("shows the three views and today", () => {
    render(<ScheduleView />);
    expect(screen.getByRole("button", { name: "Today" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Day" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Week" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Month" })).toBeDefined();
  });

  it("gives the all day row a label", () => {
    render(<ScheduleView />);
    expect(screen.getByText("All day")).toBeDefined();
  });

  it("says nothing about errors when there are none", () => {
    render(<ScheduleView />);
    expect(screen.queryByText(/Could not save/)).toBeNull();
  });

  it("surfaces a refused write instead of hiding it", () => {
    error = "permission denied";
    render(<ScheduleView />);
    expect(screen.getByText(/permission denied/)).toBeDefined();
  });

  it("draws the events it is given", async () => {
    rows = [plain()];
    render(<ScheduleView />);
    await waitFor(() => expect(screen.getByText("Coffee")).toBeDefined());
  });
});

describe("clicking an event", () => {
  async function openDetails() {
    rows = [plain({ notes: "with milk" })];
    const user = userEvent.setup();
    render(<ScheduleView />);
    await waitFor(() => expect(screen.getByText("Coffee")).toBeDefined());
    await user.click(screen.getByText("Coffee"));
    return user;
  }

  it("opens the details card, not the form", async () => {
    await openDetails();
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("with milk")).toBeDefined();
    expect(screen.queryByText("Edit event")).toBeNull();
  });

  it("switches to the form on the pencil", async () => {
    const user = await openDetails();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit event")).toBeDefined();
  });

  it("deletes a plain event without asking", async () => {
    const user = await openDetails();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(removed).toHaveLength(1);
    expect(removed[0].scope).toBe("one");
  });

  it("closes on the cross", async () => {
    const user = await openDetails();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks which occurrences before deleting a repeating event", async () => {
    rows = [
      plain({
        id: "s1::x",
        seriesId: "s1",
        occurrenceDate: "2026-03-16",
        recurrence: { freq: "weekly", interval: 1 },
      }),
    ];
    const user = userEvent.setup();
    render(<ScheduleView />);
    await waitFor(() => expect(screen.getByText("Coffee")).toBeDefined());
    await user.click(screen.getByText("Coffee"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete repeating event")).toBeDefined();
    expect(removed).toHaveLength(0);
  });
});

describe("undo by keyboard", () => {
  it("undoes on control z", async () => {
    const user = userEvent.setup();
    render(<ScheduleView />);
    await user.keyboard("{Control>}z{/Control}");
    expect(undone).toHaveBeenCalledOnce();
  });

  it("undoes on command z", async () => {
    const user = userEvent.setup();
    render(<ScheduleView />);
    await user.keyboard("{Meta>}z{/Meta}");
    expect(undone).toHaveBeenCalledOnce();
  });

  it("leaves control shift z alone, that is redo", async () => {
    const user = userEvent.setup();
    render(<ScheduleView />);
    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(undone).not.toHaveBeenCalled();
  });

  it("stays out of the way while text is being typed", async () => {
    rows = [plain()];
    const user = userEvent.setup();
    render(<ScheduleView />);
    await waitFor(() => expect(screen.getByText("Coffee")).toBeDefined());
    await user.click(screen.getByText("Coffee"));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByLabelText("Title"));
    await user.keyboard("{Control>}z{/Control}");
    expect(undone).not.toHaveBeenCalled();
  });
});
