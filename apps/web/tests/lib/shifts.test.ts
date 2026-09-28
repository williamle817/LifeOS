import { describe, expect, it, vi } from "vitest";
import type { LifeEvent } from "@lifeos/contracts";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

const { hoursOf, payFor, shiftsIn } = await import("@/lib/shifts");

const MARCH = { year: 2026, month: 2 };

let seq = 0;

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 2, day, hour, minute).toISOString();
}

function shift(over: Partial<LifeEvent> = {}): LifeEvent {
  seq += 1;
  return {
    id: `e-${seq}`,
    userId: "u1",
    type: "work",
    title: "Working shift",
    start: at(4, 9),
    end: at(4, 14),
    wage: 20,
    ...over,
  } as LifeEvent;
}

describe("how long a shift ran", () => {
  it("reads the hours off the start and the end", () => {
    expect(hoursOf(shift({ start: at(4, 9), end: at(4, 14) }))).toBe(5);
  });

  it("counts part hours", () => {
    expect(hoursOf(shift({ start: at(4, 9), end: at(4, 12, 30) }))).toBe(3.5);
  });

  it("gives an all day shift no hours, because there are none to read", () => {
    expect(
      hoursOf(shift({ allDay: true, start: "2026-03-04", end: "2026-03-05" })),
    ).toBe(0);
  });

  it("refuses to go negative when the end is before the start", () => {
    expect(hoursOf(shift({ start: at(4, 14), end: at(4, 9) }))).toBe(0);
  });
});

describe("what a shift paid", () => {
  it("multiplies the hours by the wage", () => {
    expect(payFor(shift({ wage: 20 }))).toBe(100);
  });

  it("adds the tips on top", () => {
    expect(payFor(shift({ wage: 20, tips: 35.5 }))).toBe(135.5);
  });

  it("pays nothing but tips when no wage was entered", () => {
    expect(payFor(shift({ wage: undefined, tips: 40 }))).toBe(40);
  });

  it("pays nothing at all when neither was entered", () => {
    expect(payFor(shift({ wage: undefined }))).toBe(0);
  });

  it("rounds to cents rather than carrying float dust", () => {
    expect(
      payFor(shift({ start: at(4, 9), end: at(4, 12, 20), wage: 18.35 })),
    ).toBe(61.17);
  });

  it("pays nothing for an event that is not work", () => {
    expect(
      payFor(shift({ type: "general" } as Partial<LifeEvent>)),
    ).toBe(0);
  });
});

describe("pulling the month's shifts out of the calendar", () => {
  it("takes work and leaves everything else", () => {
    const rows = shiftsIn(
      [
        shift({ id: "work", title: "Cafe" }),
        shift({ id: "gym", type: "gym", workout: "Legs" } as Partial<LifeEvent>),
      ],
      MARCH,
    );
    expect(rows.map((one) => one.flow.title)).toEqual(["Cafe"]);
  });

  it("files the shift on the day it started", () => {
    const rows = shiftsIn([shift({ start: at(7, 17), end: at(7, 22) })], MARCH);
    expect(rows[0].on).toBe("2026-03-07");
  });

  it("turns it into income worth what it paid", () => {
    const rows = shiftsIn([shift({ wage: 20, tips: 15 })], MARCH);
    expect(rows[0].flow.kind).toBe("income");
    expect(rows[0].flow.amount).toBe(115);
  });

  it("carries the place over as the location", () => {
    const rows = shiftsIn([shift({ place: "The cafe" })], MARCH);
    expect(rows[0].flow.place).toBe("The cafe");
  });

  it("leaves the location off when the shift had none", () => {
    const rows = shiftsIn([shift()], MARCH);
    expect("place" in rows[0].flow).toBe(false);
  });

  it("points back at the event it came from", () => {
    const rows = shiftsIn([shift({ id: "the-shift" })], MARCH);
    expect(rows[0].flow.eventId).toBe("the-shift");
    expect(rows[0].flow.id).not.toBe("the-shift");
  });

  it("leaves out a shift from another month", () => {
    const other = new Date(2026, 3, 4, 9).toISOString();
    const rows = shiftsIn(
      [shift({ start: other, end: new Date(2026, 3, 4, 14).toISOString() })],
      MARCH,
    );
    expect(rows).toHaveLength(0);
  });

  it("gives every week of a repeating shift its own row", () => {
    const rows = shiftsIn(
      [
        shift({
          id: "weekly",
          seriesId: "weekly",
          start: at(2, 9),
          end: at(2, 14),
          recurrence: { freq: "weekly", interval: 1 },
        } as Partial<LifeEvent>),
      ],
      MARCH,
    );
    expect(rows.map((one) => one.on)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
  });

  it("stops a repeating shift at the edge of the month", () => {
    const rows = shiftsIn(
      [
        shift({
          id: "weekly",
          seriesId: "weekly",
          start: new Date(2026, 1, 2, 9).toISOString(),
          end: new Date(2026, 1, 2, 14).toISOString(),
          recurrence: { freq: "weekly", interval: 1 },
        } as Partial<LifeEvent>),
      ],
      MARCH,
    );
    expect(rows.every((one) => one.on.startsWith("2026-03"))).toBe(true);
  });

  it("lists them soonest first", () => {
    const rows = shiftsIn(
      [
        shift({ title: "Late", start: at(20, 9), end: at(20, 14) }),
        shift({ title: "Early", start: at(3, 9), end: at(3, 14) }),
      ],
      MARCH,
    );
    expect(rows.map((one) => one.flow.title)).toEqual(["Early", "Late"]);
  });

  it("finds nothing in a month with no shifts in it", () => {
    expect(shiftsIn([], MARCH)).toEqual([]);
  });
});
