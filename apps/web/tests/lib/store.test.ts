import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calls,
  resetDb,
  row,
  seed,
  type FakeRow,
} from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

type Wired = {
  events: typeof import("@/modules/schedule/lib/event-store");
  academic: typeof import("@/modules/academic/lib/course-store");
  flows: typeof import("@/modules/finance/lib/flow-store");
  store: typeof import("@/lib/store");
};

function courseRow(over: FakeRow = {}): FakeRow {
  return {
    id: "c1",
    user_id: "u1",
    semester_id: "sem-1",
    title: "Data Structures",
    code: "CS 201",
    color: null,
    scale: [],
    ...over,
  };
}

async function wire(): Promise<Wired> {
  resetDb([row()]);
  seed("courses", [courseRow()]);
  vi.resetModules();
  const store = await import("@/lib/store");
  const events = await import("@/modules/schedule/lib/event-store");
  const academic = await import("@/modules/academic/lib/course-store");
  const flows = await import("@/modules/finance/lib/flow-store");
  await events.ensureLoaded();
  await academic.ensureLoaded();
  return { events, academic, flows, store };
}

beforeEach(() => {
  resetDb();
});

describe("picking up what another tab changed", () => {
  it("reads every open store again", async () => {
    const { events, academic, store } = await wire();
    seed("events", []);
    seed("courses", []);
    await store.refreshAll();
    expect(events.getSnapshot()).toHaveLength(0);
    expect(academic.getSnapshot().courses).toHaveLength(0);
  });

  it("picks up a row another tab added and tells whoever is listening", async () => {
    const { events, store } = await wire();
    const seen = vi.fn();
    const off = events.subscribe(seen);
    seed("events", [row(), row({ id: "e2", title: "New from elsewhere" })]);
    await store.refreshAll();
    expect(events.getSnapshot().map((e) => e.title)).toContain(
      "New from elsewhere",
    );
    expect(seen).toHaveBeenCalled();
    off();
  });

  it("leaves alone a store no page has opened", async () => {
    const { store } = await wire();
    calls().length = 0;
    await store.refreshAll();
    expect(calls()).not.toContain("select flows");
  });

  it("does not ask who you are again", async () => {
    const { store } = await wire();
    calls().length = 0;
    await store.refreshAll();
    expect(calls()).not.toContain("select users");
  });

  it("runs once when the tab and the window both report a return", async () => {
    const { store } = await wire();
    calls().length = 0;
    await Promise.all([store.refreshAll(), store.refreshAll()]);
    expect(calls().filter((c) => c === "select events")).toHaveLength(1);
  });

  it("does not undo a write made while it was reading", async () => {
    const { events, store } = await wire();
    const reading = store.refreshAll();
    void events.addEvent({
      id: "fresh",
      userId: "u1",
      type: "general",
      title: "Just added",
      start: "2026-03-02T09:00:00.000Z",
      end: "2026-03-02T10:00:00.000Z",
    });
    await reading;
    expect(events.getSnapshot().map((e) => e.id)).toContain("fresh");
  });
});

describe("a different person signing in", () => {
  it("forgets everything the last person loaded", async () => {
    const { events, academic, store } = await wire();
    store.follow("someone-else");
    expect(events.getSnapshot()).toHaveLength(0);
    expect(academic.getSnapshot().courses).toHaveLength(0);
    expect(store.currentUserId()).toBeNull();
  });

  it("loads the new person's data instead of the old cache", async () => {
    const { events, store } = await wire();
    store.follow("someone-else");
    seed("events", [row({ id: "theirs", title: "Theirs" })]);
    await events.ensureLoaded();
    expect(events.getSnapshot().map((e) => e.id)).toEqual(["theirs"]);
  });

  it("throws away a read that was still running for the last person", async () => {
    const { events, store } = await wire();
    const reading = store.refreshAll();
    store.follow("someone-else");
    await reading;
    expect(events.getSnapshot()).toHaveLength(0);
  });

  it("changes nothing when the same person is reported again", async () => {
    const { events, store } = await wire();
    store.follow("auth-1");
    await events.ensureLoaded();
    store.follow("auth-1");
    expect(events.getSnapshot()).toHaveLength(1);
  });
});
