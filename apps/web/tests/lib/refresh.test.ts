import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
  refresh: typeof import("@/lib/refresh");
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
  const events = await import("@/modules/schedule/lib/event-store");
  const academic = await import("@/modules/academic/lib/course-store");
  const refresh = await import("@/lib/refresh");
  await events.ensureLoaded();
  await academic.ensureLoaded();
  return { events, academic, refresh };
}

beforeEach(() => {
  resetDb();
});

describe("picking up what another tab changed", () => {
  it("reads both stores again", async () => {
    const { events, academic, refresh } = await wire();
    expect(events.getSnapshot()).toHaveLength(1);
    expect(academic.getSnapshot().courses).toHaveLength(1);

    seed("events", []);
    seed("courses", []);
    await refresh.refreshAll();

    expect(events.getSnapshot()).toHaveLength(0);
    expect(academic.getSnapshot().courses).toHaveLength(0);
  });

  it("picks up a row another tab added", async () => {
    const { events, refresh } = await wire();
    seed("events", [row(), row({ id: "e2", title: "New from elsewhere" })]);
    await refresh.refreshAll();
    expect(events.getSnapshot().map((e) => e.title)).toContain(
      "New from elsewhere",
    );
  });

  it("tells whoever is listening", async () => {
    const { events, refresh } = await wire();
    const seen = vi.fn();
    const off = events.subscribe(seen);
    seed("events", []);
    await refresh.refreshAll();
    expect(seen).toHaveBeenCalled();
    off();
  });
});
