import { describe, expect, it } from "vitest";
import type { Flow } from "@lifeos/contracts";
import {
  dateIn,
  dayBefore,
  daysUntil,
  daysInMonth,
  inMonth,
  monthLabel,
  newestFirst,
  money,
  round,
  pending,
  sameMonth,
  settled,
  shift,
  thisMonth,
  todayIso,
  total,
  whenLabel,
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

describe("what has happened and what has not", () => {
  const TODAY = new Date(2026, 2, 10);
  const MARCH = { year: 2026, month: 2 };

  it("writes today the way a date is stored", () => {
    expect(todayIso(TODAY)).toBe("2026-03-10");
  });

  it("counts the days to a date", () => {
    expect(daysUntil("2026-03-13", TODAY)).toBe(3);
    expect(daysUntil("2026-03-10", TODAY)).toBe(0);
    expect(daysUntil("2026-03-09", TODAY)).toBe(-1);
  });

  it("says when in plain words", () => {
    expect(whenLabel("2026-03-10", TODAY)).toBe("today");
    expect(whenLabel("2026-03-11", TODAY)).toBe("tomorrow");
    expect(whenLabel("2026-03-15", TODAY)).toBe("in 5 days");
  });

  it("counts today as already gone out", () => {
    const rows = inMonth([flow({ id: "now", on: "2026-03-10" })], MARCH);
    expect(settled(rows, TODAY)).toHaveLength(1);
    expect(pending(rows, TODAY)).toHaveLength(0);
  });

  it("splits the month at today", () => {
    const rows = inMonth(
      [
        flow({ id: "past", on: "2026-03-04" }),
        flow({ id: "soon", on: "2026-03-14" }),
      ],
      MARCH,
    );
    expect(settled(rows, TODAY).map((one) => one.flow.id)).toEqual(["past"]);
    expect(pending(rows, TODAY).map((one) => one.flow.id)).toEqual(["soon"]);
  });

  it("treats a whole past month as gone", () => {
    const rows = inMonth([flow({ on: "2026-01-20" })], { year: 2026, month: 0 });
    expect(pending(rows, TODAY)).toHaveLength(0);
  });

  it("treats a whole future month as still to come", () => {
    const rows = inMonth([flow({ on: "2026-05-20" })], { year: 2026, month: 4 });
    expect(settled(rows, TODAY)).toHaveLength(0);
  });
});

describe("cutting a series short", () => {
  const MARCH = { year: 2026, month: 2 };

  it("steps back a day, over the turn of a month", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
    expect(dayBefore("2026-03-15")).toBe("2026-03-14");
  });

  it("stops a series after the day it was ended on", () => {
    const one = flow({
      on: "2026-01-10",
      repeat: "monthly",
      until: "2026-02-28",
    });
    expect(dateIn(one, { year: 2026, month: 1 })).toBe("2026-02-10");
    expect(dateIn(one, MARCH)).toBeNull();
  });

  it("drops a single skipped date and keeps the rest", () => {
    const one = flow({
      on: "2026-01-10",
      repeat: "monthly",
      skips: ["2026-03-10"],
    });
    expect(dateIn(one, MARCH)).toBeNull();
    expect(dateIn(one, { year: 2026, month: 3 })).toBe("2026-04-10");
  });

  it("leaves a one off alone when nothing was skipped", () => {
    expect(dateIn(flow({ on: "2026-03-10" }), MARCH)).toBe("2026-03-10");
  });
});

describe("the order the lists read in", () => {
  const MARCH = { year: 2026, month: 2 };

  it("puts the latest date at the top", () => {
    const rows = newestFirst(
      inMonth(
        [
          flow({ id: "early", on: "2026-03-02" }),
          flow({ id: "late", on: "2026-03-28" }),
          flow({ id: "middle", on: "2026-03-15" }),
        ],
        MARCH,
      ),
    );
    expect(rows.map((one) => one.flow.id)).toEqual([
      "late",
      "middle",
      "early",
    ]);
  });

  it("keeps the order you dragged them into on the same date", () => {
    const rows = newestFirst(
      inMonth(
        [
          flow({ id: "second", on: "2026-03-02", position: 1 }),
          flow({ id: "first", on: "2026-03-02", position: 0 }),
        ],
        MARCH,
      ),
    );
    expect(rows.map((one) => one.flow.id)).toEqual(["first", "second"]);
  });

  it("leaves the list it was given alone", () => {
    const rows = inMonth(
      [
        flow({ id: "early", on: "2026-03-02" }),
        flow({ id: "late", on: "2026-03-28" }),
      ],
      MARCH,
    );
    newestFirst(rows);
    expect(rows.map((one) => one.flow.id)).toEqual(["early", "late"]);
  });
});
