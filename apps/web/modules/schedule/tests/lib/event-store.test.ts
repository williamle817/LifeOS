import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifeEvent } from "@lifeos/contracts";
import { dayKey } from "@/modules/schedule/lib/recurrence";
import {
  calls,
  failOn,
  resetDb,
  row,
  storedEvent,
  storedEvents,
  type FakeRow,
} from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

type Store = typeof import("@/modules/schedule/lib/event-store");

async function store(events: FakeRow[] = []): Promise<Store> {
  resetDb(events);
  vi.resetModules();
  const loaded: Store = await import("@/modules/schedule/lib/event-store");
  await loaded.ensureLoaded();
  return loaded;
}

function local(day: string, hour = 9, minute = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

const HEAD = "s1";

function headRow(over: FakeRow = {}): FakeRow {
  return row({
    id: HEAD,
    series_id: HEAD,
    recurrence: { freq: "weekly", interval: 1 },
    start_at: local("2026-03-02", 9),
    end_at: local("2026-03-02", 10),
    ...over,
  });
}

function occurrence(date: string, over: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: `${HEAD}::${date}`,
    userId: "u1",
    type: "general",
    title: "Gym",
    start: local(date, 9),
    end: local(date, 10),
    seriesId: HEAD,
    occurrenceDate: date,
    recurrence: { freq: "weekly", interval: 1 },
    ...over,
  } as LifeEvent;
}

function plain(over: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: "e1",
    userId: "u1",
    type: "general",
    title: "Coffee",
    start: local("2026-03-02", 9),
    end: local("2026-03-02", 10),
    ...over,
  } as LifeEvent;
}

beforeEach(() => {
  resetDb();
});

describe("loading", () => {
  it("starts empty on the server so hydration matches", async () => {
    const s = await store([row()]);
    expect(s.getServerSnapshot()).toEqual([]);
  });

  it("reads the profile id and keeps it", async () => {
    const s = await store();
    expect(s.currentUserId()).toBe("u1");
  });

  it("loads only once even when several callers ask", async () => {
    resetDb([row()]);
    vi.resetModules();
    const s: Store = await import("@/modules/schedule/lib/event-store");
    await Promise.all([s.ensureLoaded(), s.ensureLoaded(), s.ensureLoaded()]);
    expect(calls().filter((c) => c === "select users")).toHaveLength(1);
  });

  it("maps a database row into an event", async () => {
    const s = await store([
      row({
        color: "pink",
        notes: "bring shoes",
        all_day: true,
        series_id: "abc",
        occurrence_date: "2026-03-02",
        cancelled: true,
      }),
    ]);
    expect(s.getSnapshot()[0]).toMatchObject({
      id: "e1",
      userId: "u1",
      title: "Gym",
      color: "pink",
      notes: "bring shoes",
      allDay: true,
      seriesId: "abc",
      occurrenceDate: "2026-03-02",
      cancelled: true,
    });
  });

  it("leaves absent optional columns off the event entirely", async () => {
    const s = await store([row()]);
    const event = s.getSnapshot()[0];
    expect("color" in event).toBe(false);
    expect("notes" in event).toBe(false);
    expect("allDay" in event).toBe(false);
  });

  it("spreads the per type fields back out of the data column", async () => {
    const s = await store([
      row({ type: "dining", data: { place: "Pho 24", amount: 12.5 } }),
    ]);
    expect(s.getSnapshot()[0]).toMatchObject({ place: "Pho 24", amount: 12.5 });
  });
});

describe("the external store contract", () => {
  it("hands back the same array until a write replaces it", async () => {
    const s = await store([row()]);
    expect(s.getSnapshot()).toBe(s.getSnapshot());
  });

  it("tells subscribers when the data changes", async () => {
    const s = await store();
    const seen = vi.fn();
    const off = s.subscribe(seen);
    await s.addEvent(plain());
    expect(seen).toHaveBeenCalled();
    off();
    await s.addEvent(plain({ id: "e2" }));
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe("writing", () => {
  it("adds to the cache and to the database", async () => {
    const s = await store();
    await s.addEvent(plain());
    expect(s.getSnapshot()).toHaveLength(1);
    expect(storedEvent("e1")).toBeDefined();
  });

  it("puts the per type fields into the data column", async () => {
    const s = await store();
    await s.addEvent(
      plain({ type: "dining", place: "Pho 24", amount: 12.5 } as never),
    );
    expect(storedEvent("e1")?.data).toEqual({ place: "Pho 24", amount: 12.5 });
  });

  it("stamps the owner from the session when the event carries none", async () => {
    const s = await store();
    await s.addEvent(plain({ userId: "" }));
    expect(storedEvent("e1")?.user_id).toBe("u1");
  });

  it("updates in place", async () => {
    const s = await store([row()]);
    await s.updateEvent(plain({ title: "Coffee later" }));
    expect(storedEvent("e1")?.title).toBe("Coffee later");
    expect(storedEvents()).toHaveLength(1);
  });

  it("deletes", async () => {
    const s = await store([row()]);
    await s.deleteEvent("e1");
    expect(storedEvents()).toHaveLength(0);
    expect(s.getSnapshot()).toHaveLength(0);
  });

  it("reports a refused write instead of swallowing it", async () => {
    const s = await store();
    failOn("insert events");
    await s.addEvent(plain());
    expect(s.lastWriteError()).toContain("refused");
  });

  it("puts the cache back to what the database really holds after a refusal", async () => {
    const s = await store([row()]);
    failOn("insert events");
    await s.addEvent(plain({ id: "ghost" }));
    expect(s.getSnapshot().map((e) => e.id)).toEqual(["e1"]);
  });

  it("exports what is in the cache", async () => {
    const s = await store([row()]);
    expect(JSON.parse(s.exportEvents())).toHaveLength(1);
  });
});

describe("saveOccurrence, outside a series", () => {
  it("adds an event that does not exist yet", async () => {
    const s = await store();
    await s.saveOccurrence(plain(), "one");
    expect(storedEvents()).toHaveLength(1);
  });

  it("updates an event that already exists", async () => {
    const s = await store([row()]);
    await s.saveOccurrence(plain({ title: "Tea" }), "one");
    expect(storedEvents()).toHaveLength(1);
    expect(storedEvent("e1")?.title).toBe("Tea");
  });

  it("treats a brand new repeating event as a plain insert", async () => {
    const s = await store();
    await s.saveOccurrence(
      plain({
        seriesId: "e1",
        recurrence: { freq: "weekly", interval: 1 },
      }),
      "one",
    );
    expect(storedEvents()).toHaveLength(1);
    expect(storedEvent("e1")?.recurrence).toEqual({
      freq: "weekly",
      interval: 1,
    });
  });
});

describe("saveOccurrence, this event only", () => {
  it("writes one override row and leaves the head alone", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", { title: "Gym, moved" }),
      "one",
    );
    expect(storedEvents()).toHaveLength(2);
    expect(storedEvent(HEAD)?.title).toBe("Gym");
  });

  it("gives the override its date and strips the rule off it", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "one");
    const patch = storedEvents().find((r) => r.id !== HEAD);
    expect(patch?.occurrence_date).toBe("2026-03-16");
    expect(patch?.series_id).toBe(HEAD);
    expect(patch?.recurrence).toBeNull();
    expect(patch?.cancelled).toBe(false);
  });

  it("edits the same override again instead of stacking a second one", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16", { title: "one" }), "one");
    await s.saveOccurrence(occurrence("2026-03-16", { title: "two" }), "one");
    expect(storedEvents()).toHaveLength(2);
    expect(storedEvents().find((r) => r.id !== HEAD)?.title).toBe("two");
  });

  it("brings a cancelled occurrence back when it is saved again", async () => {
    const s = await store([headRow()]);
    await s.removeOccurrence(occurrence("2026-03-16"), "one");
    await s.saveOccurrence(occurrence("2026-03-16"), "one");
    const patch = storedEvents().find((r) => r.id !== HEAD);
    expect(patch?.cancelled).toBe(false);
  });
});

describe("saveOccurrence, all events", () => {
  it("edits the head and adds no rows", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", { title: "Yoga" }),
      "all",
    );
    expect(storedEvents()).toHaveLength(1);
    expect(storedEvent(HEAD)?.title).toBe("Yoga");
  });

  it("keeps the series start where it was, so earlier occurrences survive", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "all");
    const start = storedEvent(HEAD)?.start_at as string;
    expect(dayKey(start)).toBe("2026-03-02");
  });

  it("takes the time of day from the occurrence that was dragged", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", {
        start: local("2026-03-16", 20),
        end: local("2026-03-16", 21, 30),
      }),
      "all",
    );
    expect(hourOf(storedEvent(HEAD)?.start_at as string)).toBe(20);
    expect(hourOf(storedEvent(HEAD)?.end_at as string)).toBe(21);
  });

  it("keeps the length of the event when the time moves", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", {
        start: local("2026-03-16", 20),
        end: local("2026-03-16", 21, 30),
      }),
      "all",
    );
    const head = storedEvent(HEAD);
    const span =
      new Date(head?.end_at as string).getTime() -
      new Date(head?.start_at as string).getTime();
    expect(span).toBe(90 * 60 * 1000);
  });

  it("writes the rule the form just built, not the old one", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", {
        recurrence: { freq: "daily", interval: 3 },
      }),
      "all",
    );
    expect(storedEvent(HEAD)?.recurrence).toEqual({
      freq: "daily",
      interval: 3,
    });
  });

  it("leaves an all day series on its own dates", async () => {
    const s = await store([
      headRow({ all_day: true, start_at: "2026-03-02", end_at: "2026-03-03" }),
    ]);
    await s.saveOccurrence(
      occurrence("2026-03-16", {
        allDay: true,
        start: "2026-03-16",
        end: "2026-03-17",
      }),
      "all",
    );
    expect(storedEvent(HEAD)?.start_at).toBe("2026-03-02");
    expect(storedEvent(HEAD)?.end_at).toBe("2026-03-03");
  });

  it("clears the occurrence date so the head stays a head", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "all");
    expect(storedEvent(HEAD)?.occurrence_date).toBeNull();
  });
});

describe("saveOccurrence, this and following", () => {
  it("closes the old rule the day before and starts a new head", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16", { title: "Yoga" }), "following");
    expect(storedEvents()).toHaveLength(2);
    expect(storedEvent(HEAD)?.recurrence).toMatchObject({
      until: "2026-03-15",
    });
  });

  it("gives the new head its own series id", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "following");
    const tail = storedEvents().find((r) => r.id !== HEAD);
    expect(tail?.series_id).toBe(tail?.id);
    expect(tail?.occurrence_date).toBeNull();
  });

  it("uses the rule the form built for the new head", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", {
        recurrence: { freq: "daily", interval: 1 },
      }),
      "following",
    );
    const tail = storedEvents().find((r) => r.id !== HEAD);
    expect(tail?.recurrence).toEqual({ freq: "daily", interval: 1 });
  });

  it("falls back to the old rule when the form did not change it", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(
      occurrence("2026-03-16", { recurrence: undefined }),
      "following",
    );
    const tail = storedEvents().find((r) => r.id !== HEAD);
    expect(tail?.recurrence).toEqual({ freq: "weekly", interval: 1 });
  });

  it("throws away overrides from the split date onward", async () => {
    const s = await store([
      headRow(),
      row({
        id: "old-patch",
        series_id: HEAD,
        occurrence_date: "2026-03-23",
      }),
    ]);
    await s.saveOccurrence(occurrence("2026-03-16"), "following");
    expect(storedEvent("old-patch")).toBeUndefined();
  });

  it("keeps overrides that sit before the split date", async () => {
    const s = await store([
      headRow(),
      row({
        id: "early-patch",
        series_id: HEAD,
        occurrence_date: "2026-03-09",
      }),
    ]);
    await s.saveOccurrence(occurrence("2026-03-16"), "following");
    expect(storedEvent("early-patch")).toBeDefined();
  });
});

describe("removeOccurrence", () => {
  it("deletes an event that is not part of a series", async () => {
    const s = await store([row()]);
    await s.removeOccurrence(plain(), "one");
    expect(storedEvents()).toHaveLength(0);
  });

  it("marks one occurrence cancelled and keeps the head", async () => {
    const s = await store([headRow()]);
    await s.removeOccurrence(occurrence("2026-03-16"), "one");
    const patch = storedEvents().find((r) => r.id !== HEAD);
    expect(patch?.cancelled).toBe(true);
    expect(patch?.occurrence_date).toBe("2026-03-16");
    expect(storedEvent(HEAD)).toBeDefined();
  });

  it("reuses an existing override row when cancelling", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "one");
    await s.removeOccurrence(occurrence("2026-03-16"), "one");
    expect(storedEvents()).toHaveLength(2);
  });

  it("deletes the head and every override for all events", async () => {
    const s = await store([
      headRow(),
      row({ id: "p1", series_id: HEAD, occurrence_date: "2026-03-09" }),
      row({ id: "p2", series_id: HEAD, occurrence_date: "2026-03-23" }),
    ]);
    await s.removeOccurrence(occurrence("2026-03-16"), "all");
    expect(storedEvents()).toHaveLength(0);
  });

  it("leaves other series alone when deleting all events", async () => {
    const s = await store([headRow(), row({ id: "other" })]);
    await s.removeOccurrence(occurrence("2026-03-16"), "all");
    expect(storedEvents().map((r) => r.id)).toEqual(["other"]);
  });

  it("ends the rule the day before for this and following", async () => {
    const s = await store([headRow()]);
    await s.removeOccurrence(occurrence("2026-03-16"), "following");
    expect(storedEvent(HEAD)?.recurrence).toMatchObject({
      until: "2026-03-15",
    });
  });

  it("removes the whole series when following starts at the first occurrence", async () => {
    const s = await store([headRow()]);
    await s.removeOccurrence(occurrence("2026-03-02"), "following");
    expect(storedEvents()).toHaveLength(0);
  });

  it("drops overrides at or after the cut", async () => {
    const s = await store([
      headRow(),
      row({ id: "p1", series_id: HEAD, occurrence_date: "2026-03-09" }),
      row({ id: "p2", series_id: HEAD, occurrence_date: "2026-03-23" }),
    ]);
    await s.removeOccurrence(occurrence("2026-03-16"), "following");
    expect(storedEvent("p1")).toBeDefined();
    expect(storedEvent("p2")).toBeUndefined();
  });
});

describe("undo", () => {
  it("has nothing to undo before anything happens", async () => {
    const s = await store([row()]);
    expect(s.canUndo()).toBe(false);
  });

  it("offers an undo after a save", async () => {
    const s = await store();
    await s.saveOccurrence(plain(), "one");
    expect(s.canUndo()).toBe(true);
  });

  it("puts back an event that was deleted", async () => {
    const s = await store([row()]);
    await s.removeOccurrence(plain(), "one");
    await s.undo();
    expect(storedEvent("e1")).toBeDefined();
    expect(s.getSnapshot()).toHaveLength(1);
  });

  it("takes away an event that was added", async () => {
    const s = await store();
    await s.saveOccurrence(plain(), "one");
    await s.undo();
    expect(storedEvents()).toHaveLength(0);
  });

  it("restores the old values after an edit", async () => {
    const s = await store([row()]);
    await s.saveOccurrence(plain({ title: "Tea" }), "one");
    await s.undo();
    expect(storedEvent("e1")?.title).toBe("Gym");
  });

  it("brings back every row after deleting a whole series", async () => {
    const s = await store([
      headRow(),
      row({ id: "p1", series_id: HEAD, occurrence_date: "2026-03-09" }),
    ]);
    await s.removeOccurrence(occurrence("2026-03-16"), "all");
    await s.undo();
    expect(storedEvents()).toHaveLength(2);
  });

  it("undoes a split back to one series", async () => {
    const s = await store([headRow()]);
    await s.saveOccurrence(occurrence("2026-03-16"), "following");
    await s.undo();
    expect(storedEvents()).toHaveLength(1);
    expect(storedEvent(HEAD)?.recurrence).toEqual({
      freq: "weekly",
      interval: 1,
    });
  });

  it("only goes back one step", async () => {
    const s = await store([row()]);
    await s.removeOccurrence(plain(), "one");
    await s.undo();
    expect(s.canUndo()).toBe(false);
    await s.undo();
    expect(storedEvents()).toHaveLength(1);
  });
});
