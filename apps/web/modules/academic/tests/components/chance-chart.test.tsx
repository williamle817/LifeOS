import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChanceChart } from "@/modules/academic/components/chance-chart";

const CHANCES = [
  { letter: "A" as const, chance: 62.5 },
  { letter: "B" as const, chance: 30 },
  { letter: "C" as const, chance: 7.5 },
  { letter: "D" as const, chance: 0 },
  { letter: "F" as const, chance: 0 },
];

describe("the chance chart", () => {
  it("draws one bar per letter", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("labels each bar for a screen reader", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(
      screen.getByRole("listitem", { name: "A 62.5 percent" }),
    ).toBeDefined();
  });

  it("prints the number above each bar", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(screen.getByText("62.5%")).toBeDefined();
  });

  it("names the letters underneath", () => {
    render(<ChanceChart chances={CHANCES} />);
    ["A", "B", "C", "D", "F"].forEach((letter) => {
      expect(screen.getByText(letter)).toBeDefined();
    });
  });

  it("makes the tallest bar the full height", () => {
    const { container } = render(<ChanceChart chances={CHANCES} />);
    const bars = [...container.querySelectorAll("div[style*='height']")];
    expect((bars[0] as HTMLElement).style.height).toBe("100%");
  });

  it("shows an empty track for an impossible grade", () => {
    const { container } = render(<ChanceChart chances={CHANCES} />);
    const bars = [...container.querySelectorAll("div[style*='height']")];
    expect((bars[4] as HTMLElement).style.height).toBe("0%");
  });

  it("fills the bar with a colour you can tell apart from its track", () => {
    const { container } = render(<ChanceChart chances={CHANCES} />);
    const bar = container.querySelector("div[style*='height']") as HTMLElement;
    expect(bar.style.backgroundColor).toContain("-line");
  });

  it("gives every bar a track to sit in, so a zero still reads as a zero", () => {
    const { container } = render(<ChanceChart chances={CHANCES} />);
    expect(container.querySelectorAll(".bg-surface-muted")).toHaveLength(5);
  });

  it("calls out the grade most likely to happen", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(screen.getByText("most likely A")).toBeDefined();
  });

  it("gives the bars a container with a real height, so percentages resolve", () => {
    const { container } = render(<ChanceChart chances={CHANCES} />);
    const row = container.querySelector("[role='list']") as HTMLElement;
    expect(row.className).toContain("h-44");
    const column = row.firstElementChild as HTMLElement;
    expect(column.className).toContain("h-full");
  });

  it("says out loud what it is assuming", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(screen.getByText(/cannot know that the final is harder/)).toBeDefined();
  });

  it("names each letter under its bar", () => {
    render(<ChanceChart chances={CHANCES} />);
    expect(
      screen.getByRole("listitem", { name: "F 0 percent" }),
    ).toBeDefined();
  });

  it("copes with every grade being equally likely", () => {
    render(
      <ChanceChart
        chances={[
          { letter: "A", chance: 20 },
          { letter: "B", chance: 20 },
          { letter: "C", chance: 20 },
          { letter: "D", chance: 20 },
          { letter: "F", chance: 20 },
        ]}
      />,
    );
    expect(screen.getAllByText("20%")).toHaveLength(5);
  });
});
