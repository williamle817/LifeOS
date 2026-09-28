import { describe, expect, it } from "vitest";
import type { Flow } from "@lifeos/contracts";
import {
  dateIn,
  daysInMonth,
  inMonth,
  monthLabel,
  money,
  round,
  sameMonth,
  shift,
  thisMonth,
  total,
} from "@/modules/finance/lib/month";

function flow(over: Partial<Flow> = {}): Flow {
  return {
    id: "f1",
    userId: "u1",
    kind: "expense",
    title: "Netflix",
    on: "2026-03-10",
    amount: 15,
    repeat: "once",
    ...over,
  };
}

describe("moving between months", () => {
  it("starts on the month of the day given", () => {
    expect(thisMonth(new Date(2026, 8, 27))).toEqual({ year: 2026, month: 8 });
  });

  it("steps forward over the turn of the year", () => {
    expect(shift({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
  });

  it("steps back over the turn of the year", () => {
    expect(shift({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("steps by more than a year", () => {
    expect(shift({ year: 2026, month: 5 }, 14)).toEqual({
      year: 2027,
      month: 7,
    });
  });

  it("knows two months apart from the same month", () => {
    expect(sameMonth({ year: 2026, month: 3 }, { year: 2026, month: 3 })).toBe(
      true,
    );
    expect(sameMonth({ year: 2026, month: 3 }, { year: 2025, month: 3 })).toBe(
      false,
    );
  });

  it("names the month with its year", () => {
    expect(monthLabel({ year: 2026, month: 8 })).toBe("September 2026");
  });

  it("counts the days in a month, leap year included", () => {
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 1 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 3 })).toBe(30);
  });
});

describe("when an entry lands in a month", () => {
  it("shows a one off only in its own month", () => {
    const one = flow({ on: "2026-03-10" });
    expect(dateIn(one, { year: 2026, month: 2 })).toBe("2026-03-10");
    expect(dateIn(one, { year: 2026, month: 3 })).toBeNull();
    expect(dateIn(one, { year: 2025, month: 2 })).toBeNull();
  });

  it("repeats a monthly entry in every month from its start", () => {
    const one = flow({ on: "2026-03-10", repeat: "monthly" });
    expect(dateIn(one, { year: 2026, month: 2 })).toBe("2026-03-10");
    expect(dateIn(one, { year: 2026, month: 5 })).toBe("2026-06-10");
    expect(dateIn(one, { year: 2027, month: 0 })).toBe("2027-01-10");
  });

  it("does not run a monthly entry before it started", () => {
    const one = flow({ on: "2026-03-10", repeat: "monthly" });
    expect(dateIn(one, { year: 2026, month: 1 })).toBeNull();
    expect(dateIn(one, { year: 2025, month: 11 })).toBeNull();
  });

  it("pulls a late day back to the last day of a short month", () => {
    const one = flow({ on: "2026-01-31", repeat: "monthly" });
    expect(dateIn(one, { year: 2026, month: 1 })).toBe("2026-02-28");
    expect(dateIn(one, { year: 2026, month: 3 })).toBe("2026-04-30");
    expect(dateIn(one, { year: 2026, month: 4 })).toBe("2026-05-31");
  });

  it("repeats a yearly entry only in the month it started in", () => {
    const one = flow({ on: "2026-03-10", repeat: "yearly" });
    expect(dateIn(one, { year: 2027, month: 2 })).toBe("2027-03-10");
    expect(dateIn(one, { year: 2027, month: 3 })).toBeNull();
    expect(dateIn(one, { year: 2025, month: 2 })).toBeNull();
  });
});

describe("the month list", () => {
  it("keeps only what falls in the month", () => {
    const rows = inMonth(
      [
        flow({ id: "a", on: "2026-03-05" }),
        flow({ id: "b", on: "2026-04-05" }),
        flow({ id: "c", on: "2026-01-20", repeat: "monthly" }),
      ],
      { year: 2026, month: 2 },
    );
    expect(rows.map((one) => one.flow.id)).toEqual(["a", "c"]);
  });

  it("carries the date the entry lands on, not the one stored", () => {
    const rows = inMonth([flow({ on: "2026-01-20", repeat: "monthly" })], {
      year: 2026,
      month: 5,
    });
    expect(rows[0].on).toBe("2026-06-20");
    expect(rows[0].flow.on).toBe("2026-01-20");
  });

  it("sorts by date, soonest first", () => {
    const rows = inMonth(
      [
        flow({ id: "late", on: "2026-03-28" }),
        flow({ id: "early", on: "2026-03-02" }),
      ],
      { year: 2026, month: 2 },
    );
    expect(rows.map((one) => one.flow.id)).toEqual(["early", "late"]);
  });

  it("falls back to the order you dragged them into on the same date", () => {
    const rows = inMonth(
      [
        flow({ id: "second", on: "2026-03-02", position: 1 }),
        flow({ id: "first", on: "2026-03-02", position: 0 }),
      ],
      { year: 2026, month: 2 },
    );
    expect(rows.map((one) => one.flow.id)).toEqual(["first", "second"]);
  });
});

describe("adding money up", () => {
  it("rounds to cents at every step", () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
  });

  it("totals a month without float dust", () => {
    const rows = inMonth(
      [
        flow({ id: "a", on: "2026-03-01", amount: 0.1 }),
        flow({ id: "b", on: "2026-03-02", amount: 0.2 }),
      ],
      { year: 2026, month: 2 },
    );
    expect(total(rows)).toBe(0.3);
  });

  it("totals nothing as zero", () => {
    expect(total([])).toBe(0);
  });

  it("writes an amount the way money is written", () => {
    expect(money(1234.5)).toBe("$1,234.50");
    expect(money(-20)).toBe("-$20.00");
  });
});
