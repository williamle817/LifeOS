import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScopeAsk } from "@/components/scope-ask";

function show() {
  const onPick = vi.fn();
  const onCancel = vi.fn();
  render(
    <ScopeAsk
      title="Change repeating event"
      onPick={onPick}
      onCancel={onCancel}
    />,
  );
  return { onPick, onCancel };
}

describe("the scope question", () => {
  it("shows the title it was given", () => {
    show();
    expect(screen.getByText("Change repeating event")).toBeDefined();
  });

  it("offers exactly the three scopes, in order", () => {
    show();
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.textContent)
      .filter((t) => t !== "Cancel");
    expect(labels).toEqual([
      "This event",
      "This and following events",
      "All events",
    ]);
  });

  it("reports this event only", async () => {
    const user = userEvent.setup();
    const { onPick } = show();
    await user.click(screen.getByRole("button", { name: "This event" }));
    expect(onPick).toHaveBeenCalledWith("one");
  });

  it("reports this and following", async () => {
    const user = userEvent.setup();
    const { onPick } = show();
    await user.click(
      screen.getByRole("button", { name: "This and following events" }),
    );
    expect(onPick).toHaveBeenCalledWith("following");
  });

  it("reports all events", async () => {
    const user = userEvent.setup();
    const { onPick } = show();
    await user.click(screen.getByRole("button", { name: "All events" }));
    expect(onPick).toHaveBeenCalledWith("all");
  });

  it("backs out without picking anything", async () => {
    const user = userEvent.setup();
    const { onPick, onCancel } = show();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });
});
