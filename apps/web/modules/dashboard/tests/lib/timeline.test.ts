import { describe, expect, it } from "vitest";
import type { LifeEvent } from "@lifeos/contracts";
import { inLabel, timeline, type Slot } from "@/modules/dashboard/lib/timeline";

let seq = 0;

function at(hour: number, minute = 0): string {
  return new Date(2026, 2, 10, hour, minute).toISOString();
}

function event(title: string, start: string, end: string, over: Partial<LifeEvent> = {}): LifeEvent {
  seq += 1;
  return {
    id: `e-${seq}`,
    userId: "u1",
    type: "general",
    title,
    start,
    end,
    ...over,
  } as LifeEvent;
}

const NOON = new Date(2026, 2, 10, 12).getTime();

function read(slots: Slot[]): string[] {
  return slots.map((slot) =>
    slot.kind === "now" ? "|now|" : `${slot.event.title}:${slot.moment}`,
  );
}

describe("today as a line through time", () => {
  it("puts the now line after what has started and before what has not", () => {
    const { slots } = timeline(
      [
        event("Gym", at(8), at(9)),
        event("Lunch", at(11, 30), at(12, 30)),
        event("Class", at(14), at(15)),
        event("Dinner", at(19), at(20)),
      ],
      NOON,
      5,
    );
    expect(read(slots)).toEqual([
      "Gym:past",
      "Lunch:now",
      "|now|",
      "Class:next",
      "Dinner:later",
    ]);
  });

  it("counts the minutes to what is next", () => {
    const { slots } = timeline([event("Class", at(12, 48), at(14))], NOON, 5);
    const next = slots.find((slot) => slot.kind === "event");
    expect(next).toMatchObject({ moment: "next", minutes: 48 });
  });

  it("draws the now line at the end when the day is over", () => {
    const { slots } = timeline([event("Gym", at(8), at(9))], NOON, 5);
    expect(read(slots)).toEqual(["Gym:past", "|now|"]);
  });

  it("keeps all day events above the line and out of it", () => {
    const { slots } = timeline(
      [
        event("Birthday", "2026-03-10", "2026-03-11", { allDay: true }),
        event("Class", at(14), at(15)),
      ],
      NOON,
      5,
    );
    expect(read(slots)).toEqual(["Birthday:all-day", "|now|", "Class:next"]);
  });

  it("draws no line on a day with only all day events", () => {
    const { slots } = timeline(
      [event("Birthday", "2026-03-10", "2026-03-11", { allDay: true })],
      NOON,
      5,
    );
    expect(read(slots)).toEqual(["Birthday:all-day"]);
  });

  it("drops the oldest finished events first when there is no room", () => {
    const { slots, hidden } = timeline(
      [
        event("One", at(7), at(8)),
        event("Two", at(8), at(9)),
        event("Three", at(9), at(10)),
        event("Four", at(14), at(15)),
      ],
      NOON,
      2,
    );
    expect(read(slots)).toEqual(["Three:past", "|now|", "Four:next"]);
    expect(hidden).toBe(2);
  });
});

describe("how far off something is", () => {
  it("says minutes under an hour and hours after", () => {
    expect(inLabel(48)).toBe("in 48 min");
    expect(inLabel(60)).toBe("in 1h");
    expect(inLabel(125)).toBe("in 2h 5m");
  });
});
