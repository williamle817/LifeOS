import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Flow } from "@lifeos/contracts";
import { ComingUp } from "@/modules/finance/components/coming-up";
import { inMonth, pending } from "@/modules/finance/lib/month";

const TODAY = new Date(2026, 2, 10);
const MARCH = { year: 2026, month: 2 };

let seq = 0;

function flow(over: Partial<Flow> = {}): Flow {
  seq += 1;
  return {
    id: `f-${seq}`,
    userId: "u1",
    kind: "expense",
    title: "Netflix",
    on: "2026-03-20",
    amount: 15,
    repeat: "monthly",
    ...over,
  };
}

function show(flows: Flow[], month = MARCH) {
  return render(
    <ComingUp rows={pending(inMonth(flows, month), TODAY)} today={TODAY} />,
  );
}

function rows(): string[] {
  return within(screen.getByLabelText("Coming up"))
    .getAllByRole("listitem")
    .map((one) => one.textContent ?? "");
}

describe("what is due later this month", () => {
  it("draws nothing when there is nothing due", () => {
    const { container } = show([]);
    expect(container.innerHTML).toBe("");
  });

  it("lists an upcoming payment with its date and how far off it is", () => {
    show([flow()]);
    expect(rows()[0]).toContain("Netflix");
    expect(rows()[0]).toContain("$15.00");
    expect(rows()[0]).toContain("Mar 20");
    expect(rows()[0]).toContain("in 10 days");
  });

  it("leaves out a payment that already went out", () => {
    const { container } = show([flow({ on: "2026-03-02", repeat: "once" })]);
    expect(container.innerHTML).toBe("");
  });

  it("stays inside the month being looked at", () => {
    const { container } = show([flow({ on: "2026-04-02", repeat: "once" })]);
    expect(container.innerHTML).toBe("");
  });

  it("marks anything due within three days", () => {
    show([flow({ on: "2026-03-12" })]);
    expect(screen.getByText("in 2 days").style.color).toBe("var(--alert)");
  });

  it("leaves something further out unmarked", () => {
    show([flow({ on: "2026-03-20" })]);
    expect(screen.getByText("in 10 days").style.color).toBe("");
  });

  it("shows the day a repeating payment lands on this month", () => {
    show([flow({ on: "2026-01-25", repeat: "monthly" })]);
    expect(rows()[0]).toContain("Mar 25");
  });

  it("puts the nearest one first", () => {
    show([
      flow({ title: "Later", on: "2026-03-28", repeat: "once" }),
      flow({ title: "Sooner", on: "2026-03-14", repeat: "once" }),
    ]);
    expect(rows()[0]).toContain("Sooner");
  });

  it("shows the whole of a month still ahead", () => {
    show([flow({ on: "2026-05-04", repeat: "once" })], {
      year: 2026,
      month: 4,
    });
    expect(rows()[0]).toContain("May 4");
  });
});
