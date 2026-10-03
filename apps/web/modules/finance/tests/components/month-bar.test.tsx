import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthBar } from "@/modules/finance/components/month-bar";
import { SplitChart } from "@/modules/finance/components/split-chart";
import type { Month } from "@/modules/finance/lib/month";

const TODAY = new Date(2026, 8, 27);
const NOW: Month = { year: 2026, month: 8 };

function setup(month: Month) {
  const onChange = vi.fn();
  render(<MonthBar month={month} onChange={onChange} today={TODAY} />);
  return { onChange };
}

describe("moving month by month", () => {
  it("names the month on show", () => {
    setup(NOW);
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeTruthy();
  });

  it("steps back a month", async () => {
    const { onChange } = setup(NOW);
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 7 });
  });

  it("steps forward a month", async () => {
    const { onChange } = setup(NOW);
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 9 });
  });

  it("hides the way back while you are already on this month", () => {
    setup(NOW);
    expect(screen.queryByRole("button", { name: "This month" })).toBeNull();
  });

  it("offers the way back once you have wandered off", async () => {
    const { onChange } = setup({ year: 2026, month: 11 });
    await userEvent.click(screen.getByRole("button", { name: "This month" }));
    expect(onChange).toHaveBeenCalledWith(NOW);
  });
});

describe("the income against spending ring", () => {
  it("reads out both sides", () => {
    render(<SplitChart income={1200} expense={800} />);
    expect(
      screen.getByRole("img", { name: "Income $1,200.00, expenses $800.00" }),
    ).toBeTruthy();
  });

  it("shows what is left over", () => {
    render(<SplitChart income={1200} expense={800} />);
    expect(screen.getAllByText("$400.00").length).toBeGreaterThan(0);
  });

  it("shows a shortfall as a negative", () => {
    render(<SplitChart income={500} expense={800} />);
    expect(screen.getAllByText("-$300.00").length).toBeGreaterThan(0);
  });

  it("paints a surplus green", () => {
    const { container } = render(<SplitChart income={1200} expense={800} />);
    const left = [...container.querySelectorAll("p")].find(
      (one) => one.textContent === "$400.00",
    );
    expect(left?.style.color).toBe("var(--money-in)");
  });

  it("paints a shortfall red", () => {
    const { container } = render(<SplitChart income={500} expense={800} />);
    const left = [...container.querySelectorAll("p")].find(
      (one) => one.textContent === "-$300.00",
    );
    expect(left?.style.color).toBe("var(--money-out)");
  });

  it("leaves breaking even in plain ink", () => {
    const { container } = render(<SplitChart income={800} expense={800} />);
    const left = [...container.querySelectorAll("p")].find(
      (one) => one.textContent === "$0.00",
    );
    expect(left?.style.color).toBe("var(--ink)");
  });

  it("draws no slices at all in an empty month", () => {
    const { container } = render(<SplitChart income={0} expense={0} />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("gives each side a slice in proportion", () => {
    const { container } = render(<SplitChart income={750} expense={250} />);
    const [, green] = [...container.querySelectorAll("circle")];
    const ring = 2 * Math.PI * 52;
    const [drawn] = (green.getAttribute("stroke-dasharray") ?? "")
      .split(" ")
      .map(Number);
    expect(drawn / ring).toBeCloseTo(0.75, 5);
  });
});
