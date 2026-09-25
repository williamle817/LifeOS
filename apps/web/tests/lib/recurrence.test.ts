import { describe, expect, it } from "vitest";
import type { LifeEvent, Recurrence } from "@lifeos/contracts";
import { dayKey, expand, occurrenceId, shiftDay } from "@/lib/recurrence";

function local(day: string, hour = 9, minute = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

function midnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function single(id: string, day: string): LifeEvent {
  return {
    id,
    userId: "u1",
    type: "general",
    title: id,
    start: local(day, 9),
    end: local(day, 10),
  } as LifeEvent;
}

function series(id: string, day: string, recurrence: Recurrence): LifeEvent {
  return {
    id,
    userId: "u1",
    type: "general",
    title: id,
    start: local(day, 9),
    end: local(day, 10),
    seriesId: id,
    recurrence,
  } as LifeEvent;
}

function patch(
  seriesId: string,
  occurrenceDate: string,
  extra: Partial<LifeEvent>,
): LifeEvent {
  return {
    id: `patch-${occurrenceDate}`,
    userId: "u1",
    type: "general",
    title: "moved",
    start: local(occurrenceDate, 20),
    end: local(occurrenceDate, 21),
    seriesId,
    occurrenceDate,
    ...extra,
  } as LifeEvent;
}

function days(list: LifeEvent[]): string[] {
  return list.map((e) => dayKey(e.start)).sort();
}

describe("dayKey", () => {
  it("passes a date only string straight through", () => {
    expect(dayKey("2026-03-02")).toBe("2026-03-02");
  });

  it("reads the local day out of a full timestamp", () => {
    expect(dayKey(local("2026-03-02", 23, 30))).toBe("2026-03-02");
  });

  it("reads the local day at the start of the day", () => {
    expect(dayKey(local("2026-03-02", 0, 0))).toBe("2026-03-02");
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
  });
});

describe("occurrenceId", () => {
  it("joins the series and the date", () => {
    expect(occurrenceId("abc", "2026-03-02")).toBe("abc::2026-03-02");
  });
});

describe("expand, plain events", () => {
  it("passes non repeating events through untouched", () => {
    const rows = [single("a", "2026-03-02")];
    const out = expand(rows, midnight("2026-03-01"), midnight("2026-03-08"));
    expect(out).toEqual(rows);
  });

  it("returns nothing for an empty list", () => {
    expect(expand([], midnight("2026-03-01"), midnight("2026-03-08"))).toEqual(
      [],
    );
  });

  it("never emits a patch row as if it were its own event", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const rows = [head, patch("s", "2026-03-09", {})];
    const out = expand(rows, midnight("2026-03-09"), midnight("2026-03-10"));
    expect(out.filter((e) => dayKey(e.start) === "2026-03-09")).toHaveLength(1);
  });
});

describe("expand, frequencies", () => {
  it("emits one occurrence a day for a daily rule", () => {
    const rows = [series("s", "2026-03-02", { freq: "daily", interval: 1 })];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-05"));
    expect(days(out)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
    ]);
  });

  it("honours a daily interval of two", () => {
    const rows = [series("s", "2026-03-02", { freq: "daily", interval: 2 })];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-08"));
    expect(days(out)).toEqual([
      "2026-03-02",
      "2026-03-04",
      "2026-03-06",
      "2026-03-08",
    ]);
  });

  it("emits one occurrence a week for a weekly rule", () => {
    const rows = [series("s", "2026-03-02", { freq: "weekly", interval: 1 })];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-23"));
    expect(days(out)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
    ]);
  });

  it("keeps a biweekly rule on the original week", () => {
    const rows = [series("s", "2026-03-02", { freq: "weekly", interval: 2 })];
    const out = expand(rows, midnight("2026-04-01"), midnight("2026-04-30"));
    expect(days(out)).toEqual(["2026-04-13", "2026-04-27"]);
  });

  it("emits one occurrence a month for a monthly rule", () => {
    const rows = [series("s", "2026-03-10", { freq: "monthly", interval: 1 })];
    const out = expand(rows, midnight("2026-05-01"), midnight("2026-07-31"));
    expect(days(out)).toEqual(["2026-05-10", "2026-06-10", "2026-07-10"]);
  });

  it("emits one occurrence a year for a yearly rule", () => {
    const rows = [series("s", "2026-03-10", { freq: "yearly", interval: 1 })];
    const out = expand(rows, midnight("2029-01-01"), midnight("2029-12-31"));
    expect(days(out)).toEqual(["2029-03-10"]);
  });
});

describe("expand, weekly with chosen weekdays", () => {
  it("emits only the chosen weekdays", () => {
    const rows = [
      series("s", "2026-03-02", {
        freq: "weekly",
        interval: 1,
        byDay: [1, 3, 5],
      }),
    ];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-07"));
    expect(days(out)).toEqual(["2026-03-02", "2026-03-04", "2026-03-06"]);
  });

  it("skips the off weeks when the interval is two", () => {
    const rows = [
      series("s", "2026-03-02", {
        freq: "weekly",
        interval: 2,
        byDay: [1, 5],
      }),
    ];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-28"));
    expect(days(out)).toEqual([
      "2026-03-02",
      "2026-03-06",
      "2026-03-16",
      "2026-03-20",
    ]);
  });

  it("never emits a day before the series starts", () => {
    const rows = [
      series("s", "2026-03-04", {
        freq: "weekly",
        interval: 1,
        byDay: [1, 3, 5],
      }),
    ];
    const out = expand(rows, midnight("2026-03-01"), midnight("2026-03-07"));
    expect(days(out)).toEqual(["2026-03-04", "2026-03-06"]);
  });
});

describe("expand, the edges of the window", () => {
  it("adds a day of slack on each side, so an event straddling midnight is kept", () => {
    const rows = [series("s", "2026-03-01", { freq: "daily", interval: 1 })];
    const out = expand(rows, midnight("2026-03-10"), midnight("2026-03-12"));
    expect(days(out)).toEqual([
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
    ]);
  });

  it("does not reach further back than that one day", () => {
    const rows = [series("s", "2026-03-10", { freq: "yearly", interval: 1 })];
    const out = expand(rows, midnight("2029-01-01"), midnight("2029-12-31"));
    expect(days(out)).toEqual(["2029-03-10"]);
  });
});

describe("expand, the end of a series", () => {
  it("stops on the until date", () => {
    const rows = [
      series("s", "2026-03-02", {
        freq: "weekly",
        interval: 1,
        until: "2026-03-16",
      }),
    ];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-04-30"));
    expect(days(out)).toEqual(["2026-03-02", "2026-03-09", "2026-03-16"]);
  });

  it("emits nothing for a window that sits entirely after the until date", () => {
    const rows = [
      series("s", "2026-03-02", {
        freq: "weekly",
        interval: 1,
        until: "2026-03-16",
      }),
    ];
    expect(
      expand(rows, midnight("2026-06-01"), midnight("2026-06-30")),
    ).toEqual([]);
  });

  it("emits nothing for a window before the series starts", () => {
    const rows = [series("s", "2026-03-02", { freq: "weekly", interval: 1 })];
    expect(
      expand(rows, midnight("2026-01-01"), midnight("2026-01-31")),
    ).toEqual([]);
  });

  it("still emits a hundred years out, where the old iteration guard gave up", () => {
    const rows = [series("s", "2026-03-02", { freq: "weekly", interval: 1 })];
    const out = expand(rows, midnight("2126-03-01"), midnight("2126-03-31"));
    expect(out.length).toBeGreaterThan(3);
    expect(days(out)[0].startsWith("2126-")).toBe(true);
  });
});

describe("expand, overrides and cancellations", () => {
  it("uses the override instead of the generated occurrence", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const out = expand(
      [head, patch("s", "2026-03-09", {})],
      midnight("2026-03-09"),
      midnight("2026-03-09"),
    );
    const hit = out.find((e) => dayKey(e.start) === "2026-03-09");
    expect(hit?.title).toBe("moved");
    expect(new Date(hit!.start).getHours()).toBe(20);
  });

  it("drops a cancelled occurrence and keeps the rest", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const out = expand(
      [head, patch("s", "2026-03-09", { cancelled: true })],
      midnight("2026-03-02"),
      midnight("2026-03-16"),
    );
    expect(days(out)).toEqual(["2026-03-02", "2026-03-16"]);
  });

  it("leaves an override for a date outside the window alone", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const out = expand(
      [head, patch("s", "2026-05-04", {})],
      midnight("2026-03-02"),
      midnight("2026-03-02"),
    );
    expect(days(out)).toEqual(["2026-03-02"]);
  });
});

describe("expand, the shape of what comes out", () => {
  it("gives every occurrence an id of series and date", () => {
    const rows = [series("s", "2026-03-02", { freq: "daily", interval: 1 })];
    const out = expand(rows, midnight("2026-03-02"), midnight("2026-03-03"));
    expect(out.map((e) => e.id)).toContain("s::2026-03-03");
  });

  it("keeps the rule on each occurrence, so the form can show it again", () => {
    const rule: Recurrence = { freq: "weekly", interval: 1, byDay: [1, 3] };
    const out = expand(
      [series("s", "2026-03-02", rule)],
      midnight("2026-03-02"),
      midnight("2026-03-04"),
    );
    expect(out.every((e) => e.recurrence?.byDay?.length === 2)).toBe(true);
  });

  it("keeps the rule on an override too", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const out = expand(
      [head, patch("s", "2026-03-09", {})],
      midnight("2026-03-09"),
      midnight("2026-03-09"),
    );
    expect(out[0].recurrence?.freq).toBe("weekly");
  });

  it("marks every occurrence with the date it belongs to", () => {
    const out = expand(
      [series("s", "2026-03-02", { freq: "daily", interval: 1 })],
      midnight("2026-03-02"),
      midnight("2026-03-03"),
    );
    expect(out.map((e) => e.occurrenceDate)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
    ]);
  });

  it("preserves the duration when it moves an occurrence", () => {
    const head = series("s", "2026-03-02", { freq: "weekly", interval: 1 });
    const out = expand(
      [head],
      midnight("2026-03-09"),
      midnight("2026-03-09"),
    );
    const span =
      new Date(out[0].end).getTime() - new Date(out[0].start).getTime();
    expect(span).toBe(60 * 60 * 1000);
    expect(new Date(out[0].start).getHours()).toBe(9);
  });

  it("keeps date only strings for an all day series", () => {
    const head = {
      id: "s",
      userId: "u1",
      type: "general",
      title: "birthday",
      start: "2026-03-02",
      end: "2026-03-03",
      allDay: true,
      seriesId: "s",
      recurrence: { freq: "yearly", interval: 1 },
    } as LifeEvent;
    const out = expand([head], midnight("2027-03-01"), midnight("2027-03-31"));
    expect(out[0].start).toBe("2027-03-02");
    expect(out[0].end).toBe("2027-03-02");
  });
});
