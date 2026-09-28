import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Flow } from "@lifeos/contracts";
import {
  calls,
  failOn,
  resetDb,
  seed,
  stored,
  storedIn,
  type FakeRow,
} from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/supabase", async () => {
  const { client } = await import("@/tests/helpers/fake-supabase");
  return { supabase: client };
});

type Store = typeof import("@/modules/finance/lib/flow-store");

async function store(rows: FakeRow[] = []): Promise<Store> {
  resetDb();
  seed("flows", rows);
  vi.resetModules();
  const loaded: Store = await import("@/modules/finance/lib/flow-store");
  await loaded.ensureLoaded();
  return loaded;
}

function row(over: FakeRow = {}): FakeRow {
  return {
    id: "f1",
    user_id: "u1",
    kind: "expense",
    title: "Netflix",
    place: null,
    on_date: "2026-03-10",
    amount: 15,
    recur: "monthly",
    event_id: null,
    position: 0,
    ...over,
  };
}

function flow(over: Partial<Flow> = {}): Flow {
  return {
    id: "new-1",
    userId: "u1",
    kind: "income",
    title: "Working shift",
    on: "2026-03-04",
    amount: 120,
    repeat: "once",
    ...over,
  };
}

beforeEach(() => {
  resetDb();
});

describe("reading what is there", () => {
  it("reads nothing before the first load", async () => {
    resetDb();
    vi.resetModules();
    const loaded: Store = await import("@/modules/finance/lib/flow-store");
    expect(loaded.getServerSnapshot()).toEqual([]);
  });

  it("maps a stored row onto an entry", async () => {
    const loaded = await store([row({ place: "Cinema", event_id: "e1" })]);
    expect(loaded.getSnapshot()).toEqual([
      {
        id: "f1",
        userId: "u1",
        kind: "expense",
        title: "Netflix",
        place: "Cinema",
        on: "2026-03-10",
        amount: 15,
        repeat: "monthly",
        eventId: "e1",
        position: 0,
      },
    ]);
  });

  it("leaves out a location and an event that are not there", async () => {
    const loaded = await store([row()]);
    const [one] = loaded.getSnapshot();
    expect("place" in one).toBe(false);
    expect("eventId" in one).toBe(false);
  });

  it("hands back the same array until a write replaces it", async () => {
    const loaded = await store([row()]);
    expect(loaded.getSnapshot()).toBe(loaded.getSnapshot());
  });

  it("tells subscribers when the data changes", async () => {
    const loaded = await store([]);
    const heard = vi.fn();
    loaded.subscribe(heard);
    await loaded.saveFlow(flow());
    expect(heard).toHaveBeenCalled();
  });

  it("stops telling a subscriber that unsubscribed", async () => {
    const loaded = await store([]);
    const heard = vi.fn();
    loaded.subscribe(heard)();
    await loaded.saveFlow(flow());
    expect(heard).not.toHaveBeenCalled();
  });

  it("loads once even when asked twice at the same time", async () => {
    resetDb();
    seed("flows", [row()]);
    vi.resetModules();
    const loaded: Store = await import("@/modules/finance/lib/flow-store");
    await Promise.all([loaded.ensureLoaded(), loaded.ensureLoaded()]);
    expect(calls().filter((c) => c === "select users")).toHaveLength(1);
  });
});

describe("adding and changing an entry", () => {
  it("writes a new entry to the table", async () => {
    const loaded = await store([]);
    await loaded.saveFlow(flow({ place: "The cafe" }));
    expect(storedIn("flows", "new-1")).toMatchObject({
      kind: "income",
      title: "Working shift",
      place: "The cafe",
      on_date: "2026-03-04",
      amount: 120,
      recur: "once",
    });
  });

  it("puts a new entry at the end of its own side", async () => {
    const loaded = await store([
      row({ id: "a", kind: "income", position: 0 }),
      row({ id: "b", kind: "expense", position: 0 }),
      row({ id: "c", kind: "income", position: 1 }),
    ]);
    await loaded.saveFlow(flow({ kind: "income" }));
    expect(storedIn("flows", "new-1")?.position).toBe(2);
  });

  it("updates an entry instead of adding a second one", async () => {
    const loaded = await store([row()]);
    await loaded.saveFlow(
      flow({ id: "f1", kind: "expense", title: "Spotify", amount: 12 }),
    );
    expect(stored("flows")).toHaveLength(1);
    expect(storedIn("flows", "f1")).toMatchObject({
      title: "Spotify",
      amount: 12,
    });
  });

  it("keeps the place a row had when it is edited away", async () => {
    const loaded = await store([row({ place: "Cinema" })]);
    await loaded.saveFlow(
      flow({ id: "f1", kind: "expense", title: "Netflix", place: undefined }),
    );
    expect(storedIn("flows", "f1")?.place).toBeNull();
  });

  it("stamps the signed in user on an entry with no owner", async () => {
    const loaded = await store([]);
    await loaded.saveFlow(flow({ userId: "" }));
    expect(storedIn("flows", "new-1")?.user_id).toBe("u1");
  });

  it("removes an entry", async () => {
    const loaded = await store([row()]);
    await loaded.deleteFlow("f1");
    expect(stored("flows")).toHaveLength(0);
    expect(loaded.getSnapshot()).toHaveLength(0);
  });
});

describe("when the database refuses", () => {
  it("reports the refusal and puts the row back", async () => {
    const loaded = await store([row()]);
    failOn("insert flows");
    await loaded.saveFlow(flow());
    expect(loaded.lastWriteError()).toContain("refused");
    expect(loaded.getSnapshot().map((one) => one.id)).toEqual(["f1"]);
  });

  it("clears an old refusal on the next write", async () => {
    const loaded = await store([]);
    failOn("insert flows");
    await loaded.saveFlow(flow());
    expect(loaded.lastWriteError()).not.toBeNull();

    resetDb();
    seed("flows", []);
    await loaded.saveFlow(flow({ id: "new-2" }));
    expect(loaded.lastWriteError()).toBeNull();
  });
});

describe("putting the entries in order", () => {
  it("numbers the rows the way they were dragged", async () => {
    const loaded = await store([
      row({ id: "a", position: 0 }),
      row({ id: "b", position: 1 }),
      row({ id: "c", position: 2 }),
    ]);
    await loaded.reorderFlows(["c", "a", "b"]);
    expect(storedIn("flows", "c")?.position).toBe(0);
    expect(storedIn("flows", "a")?.position).toBe(1);
    expect(storedIn("flows", "b")?.position).toBe(2);
  });

  it("writes only the rows whose number moved", async () => {
    const loaded = await store([
      row({ id: "a", position: 0 }),
      row({ id: "b", position: 1 }),
      row({ id: "c", position: 2 }),
    ]);
    await loaded.reorderFlows(["a", "c", "b"]);
    expect(calls().filter((c) => c === "update flows")).toHaveLength(2);
  });

  it("leaves a row it was not given alone", async () => {
    const loaded = await store([
      row({ id: "a", position: 0 }),
      row({ id: "other", kind: "income", position: 7 }),
    ]);
    await loaded.reorderFlows(["a"]);
    expect(storedIn("flows", "other")?.position).toBe(7);
  });
});
