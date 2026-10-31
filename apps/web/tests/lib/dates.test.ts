import { describe, expect, it } from "vitest";
import {
  daysBetween,
  isoDay,
  parseDay,
  dueLabel,
  shiftDay,
  shortDate,
} from "@/lib/dates";

describe("isoDay", () => {
  it("writes the local date, not the UTC one", () => {
    expect(isoDay(new Date(2026, 2, 10, 23, 30))).toBe("2026-03-10");
  });

  it("pads the month and the day", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDay", () => {
  it("reads a date only string as local midnight", () => {
    const d = parseDay("2026-03-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([
      2026, 2, 10, 0,
    ]);
  });
});

describe("shiftDay", () => {
  it("moves forward", () => {
    expect(shiftDay("2026-03-02", 1)).toBe("2026-03-03");
  });

  it("moves backward across a month boundary", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("knows about leap years", () => {
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("crosses a year boundary", () => {
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("daysBetween", () => {
  it("counts whole days either way", () => {
    expect(daysBetween("2026-03-10", "2026-03-13")).toBe(3);
    expect(daysBetween("2026-03-10", "2026-03-10")).toBe(0);
    expect(daysBetween("2026-03-10", "2026-03-09")).toBe(-1);
  });

  it("is not thrown off by the clocks changing", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
});

describe("shortDate", () => {
  it("reads as month and day", () => {
    expect(shortDate("2026-03-05")).toBe("Mar 5");
  });
});

describe("dueLabel", () => {
  it("counts late work back in days", () => {
    expect(dueLabel(-1)).toBe("1 day late");
    expect(dueLabel(-4)).toBe("4 days late");
  });

  it("names today and tomorrow", () => {
    expect(dueLabel(0)).toBe("today");
    expect(dueLabel(1)).toBe("tomorrow");
  });

  it("moves to weeks after two weeks and months after two months", () => {
    expect(dueLabel(13)).toBe("in 13 days");
    expect(dueLabel(21)).toBe("in 3 weeks");
    expect(dueLabel(90)).toBe("in 3 months");
  });
});
