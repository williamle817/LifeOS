import { describe, expect, it, vi } from "vitest";
import type { LifeEvent } from "@lifeos/contracts";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

const { mondayOf, weekTotals, workoutsIn } = await import("@/lib/for-fitness");

let seq = 0;

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 2, day, hour, minute).toISOString();
}

function gym(over: Partial<LifeEvent> = {}): LifeEvent {
  seq += 1;
  return {
    id: `g-${seq}`,
    userId: "u1",
    type: "gym",
    title: `Session ${seq}`,
    workout: "Legs",
    start: at(10, 7),
    end: at(10, 8),
    ...over,
  } as LifeEvent;
}

describe("which week it is", () => {
  it("starts the week on Monday", () => {
    expect(mondayOf("2026-03-10")).toBe("2026-03-09");
    expect(mondayOf("2026-03-09")).toBe("2026-03-09");
    expect(mondayOf("2026-03-15")).toBe("2026-03-09");
  });
});

describe("the week's workouts", () => {
  it("keeps gym events inside the week, in order", () => {
    const rows = workoutsIn(
      [
        gym({ title: "Thursday", start: at(12, 7), end: at(12, 8) }),
        gym({ title: "Monday", start: at(9, 7), end: at(9, 8) }),
        gym({ title: "Last week", start: at(8, 7), end: at(8, 8) }),
        gym({ title: "Next week", start: at(16, 7), end: at(16, 8) }),
        {
          id: "x",
          userId: "u1",
          type: "general",
          title: "Not a workout",
          start: at(10, 9),
          end: at(10, 10),
        } as LifeEvent,
      ],
      "2026-03-09",
    );
    expect(rows.map((one) => one.title)).toEqual(["Monday", "Thursday"]);
  });

  it("counts every occurrence of a repeating workout", () => {
    const rows = workoutsIn(
      [
        gym({
          id: "s",
          seriesId: "s",
          title: "Run",
          recurrence: { freq: "daily", interval: 2 },
          start: at(2, 6),
          end: at(2, 6, 30),
        }),
      ],
      "2026-03-09",
    );
    expect(rows.map((one) => new Date(one.start).getDate())).toEqual([
      10, 12, 14,
    ]);
  });
});

describe("the week's totals", () => {
  it("adds up sessions, minutes and calories", () => {
    const totals = weekTotals(
      workoutsIn(
        [
          gym({ start: at(9, 7), end: at(9, 8, 30), calories: 400 }),
          gym({ start: at(11, 18), end: at(11, 18, 45) }),
        ],
        "2026-03-09",
      ),
    );
    expect(totals).toEqual({ sessions: 2, minutes: 135, calories: 400 });
  });
});
