import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const refreshAll = vi.fn(async () => {});

vi.mock("@/lib/store", () => ({ refreshAll }));

const { StayFresh } = await import("@/components/stay-fresh");

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  refreshAll.mockClear();
});

describe("coming back to the tab", () => {
  it("draws nothing of its own", () => {
    const { container } = render(<StayFresh />);
    expect(container.innerHTML).toBe("");
  });

  it("reads the stores again when the tab becomes visible", () => {
    render(<StayFresh />);
    setVisibility("visible");
    expect(refreshAll).toHaveBeenCalledOnce();
  });

  it("does nothing while the tab is hidden", () => {
    render(<StayFresh />);
    setVisibility("hidden");
    expect(refreshAll).not.toHaveBeenCalled();
  });

  it("reads again when the window is focused", () => {
    render(<StayFresh />);
    setVisibility("visible");
    refreshAll.mockClear();
    window.dispatchEvent(new Event("focus"));
    expect(refreshAll).toHaveBeenCalledOnce();
  });

  it("stops listening once it is gone", () => {
    const view = render(<StayFresh />);
    view.unmount();
    setVisibility("visible");
    expect(refreshAll).not.toHaveBeenCalled();
  });
});
