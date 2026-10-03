import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const loadedEvents = vi.fn(async () => {});
const loadedAcademic = vi.fn(async () => {});
const loadedFlows = vi.fn(async () => {});

vi.mock("@/modules/schedule/lib/event-store", () => ({
  loadEvents: loadedEvents,
}));

vi.mock("@/modules/academic/lib/course-store", () => ({
  loadAcademic: loadedAcademic,
}));

vi.mock("@/modules/finance/lib/flow-store", () => ({
  loadFlows: loadedFlows,
}));

const { StayFresh } = await import("@/components/stay-fresh");

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  loadedEvents.mockClear();
  loadedAcademic.mockClear();
  loadedFlows.mockClear();
});

describe("coming back to the tab", () => {
  it("draws nothing of its own", () => {
    const { container } = render(<StayFresh />);
    expect(container.innerHTML).toBe("");
  });

  it("reads every store again when the tab becomes visible", () => {
    render(<StayFresh />);
    setVisibility("visible");
    expect(loadedEvents).toHaveBeenCalledOnce();
    expect(loadedAcademic).toHaveBeenCalledOnce();
    expect(loadedFlows).toHaveBeenCalledOnce();
  });

  it("does nothing while the tab is hidden", () => {
    render(<StayFresh />);
    setVisibility("hidden");
    expect(loadedEvents).not.toHaveBeenCalled();
  });

  it("reads again when the window is focused", () => {
    render(<StayFresh />);
    setVisibility("visible");
    loadedEvents.mockClear();
    window.dispatchEvent(new Event("focus"));
    expect(loadedEvents).toHaveBeenCalledOnce();
  });

  it("stops listening once it is gone", () => {
    const view = render(<StayFresh />);
    view.unmount();
    setVisibility("visible");
    expect(loadedEvents).not.toHaveBeenCalled();
  });
});
