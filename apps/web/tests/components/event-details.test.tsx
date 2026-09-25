import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LifeEvent } from "@lifeos/contracts";
import { EventDetails } from "@/components/event-details";

function local(day: string, hour = 9, minute = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

function show(over: Partial<LifeEvent> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const event = {
    id: "e1",
    userId: "u1",
    type: "general",
    title: "Morning gym",
    start: local("2026-03-02", 9),
    end: local("2026-03-02", 10, 30),
    ...over,
  } as LifeEvent;

  render(
    <EventDetails
      event={event}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
    />,
  );
  return { onEdit, onDelete, onClose };
}

describe("the details card", () => {
  it("shows the title", () => {
    show();
    expect(screen.getByText("Morning gym")).toBeDefined();
  });

  it("shows the day the event is on", () => {
    show();
    expect(screen.getByText(/Mar 2, 2026/)).toBeDefined();
  });

  it("writes the time with AM and PM", () => {
    show();
    expect(screen.getByText("9:00 AM - 10:30 AM")).toBeDefined();
  });

  it("says All day instead of a time range", () => {
    show({ allDay: true, start: "2026-03-02", end: "2026-03-03" });
    expect(screen.getByText("All day")).toBeDefined();
  });

  it("reads an all day date without sliding it a day", () => {
    show({ allDay: true, start: "2026-03-02", end: "2026-03-03" });
    expect(screen.getByText(/Mar 2, 2026/)).toBeDefined();
  });

  it("leaves the notes row out when there are none", () => {
    show();
    expect(screen.queryByText("Notes")).toBeNull();
  });

  it("shows notes when there are some", () => {
    show({ notes: "bring shoes" });
    expect(screen.getByText("bring shoes")).toBeDefined();
  });

  it("keeps the line breaks in the notes", () => {
    show({ notes: "one\ntwo" });
    const body = screen.getByText(/one/);
    expect(body.className).toContain("whitespace-pre-line");
    expect(body.textContent).toBe("one\ntwo");
  });

  it("paints the dot with the colour of the event", () => {
    show({ color: "pink" });
    const dot = document.querySelector("span.rounded-full") as HTMLElement;
    expect(dot.style.backgroundColor).toContain("--event-pink");
  });
});

describe("the details card, buttons", () => {
  it("asks to edit", async () => {
    const user = userEvent.setup();
    const { onEdit } = show();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("asks to delete", async () => {
    const user = userEvent.setup();
    const { onDelete } = show();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("closes", async () => {
    const user = userEvent.setup();
    const { onClose } = show();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
