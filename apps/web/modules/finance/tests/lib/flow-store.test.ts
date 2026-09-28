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
    until_on: null,
    skips: [],
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

describe("removing one occurrence of a repeating entry", () => {
  const rent = {
    id: "rent",
    user_id: "u1",
    kind: "expense",
    title: "Rent",
    place: null,
    category: "Housing",
    on_date: "2026-01-05",
    amount: 650,
    recur: "monthly",
    until_on: null,
    skips: [],
    event_id: null,
    position: 0,
  };

  it("takes the whole series away when all is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.deleteOccurrence(loaded.getSnapshot()[0], "2026-03-05", "all");
    expect(stored("flows")).toHaveLength(0);
  });

  it("skips just that date when one is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.deleteOccurrence(loaded.getSnapshot()[0], "2026-03-05", "one");
    expect(storedIn("flows", "rent")?.skips).toEqual(["2026-03-05"]);
    expect(storedIn("flows", "rent")?.until_on).toBeNull();
  });

  it("keeps the dates skipped earlier", async () => {
    const loaded = await store([{ ...rent, skips: ["2026-02-05"] }]);
    await loaded.deleteOccurrence(loaded.getSnapshot()[0], "2026-03-05", "one");
    expect(storedIn("flows", "rent")?.skips).toEqual([
      "2026-02-05",
      "2026-03-05",
    ]);
  });

  it("ends the series the day before when following is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.deleteOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      "following",
    );
    expect(storedIn("flows", "rent")?.until_on).toBe("2026-03-04");
  });

  it("removes the row when following would leave nothing", async () => {
    const loaded = await store([rent]);
    await loaded.deleteOccurrence(
      loaded.getSnapshot()[0],
      "2026-01-05",
      "following",
    );
    expect(stored("flows")).toHaveLength(0);
  });
});

describe("changing one occurrence of a repeating entry", () => {
  const rent = {
    id: "rent",
    user_id: "u1",
    kind: "expense",
    title: "Rent",
    place: null,
    category: "Housing",
    on_date: "2026-01-05",
    amount: 650,
    recur: "monthly",
    until_on: null,
    skips: [],
    event_id: null,
    position: 0,
  };

  function edited(over: Partial<Flow> = {}): Flow {
    return {
      id: "ignored",
      userId: "u1",
      kind: "expense",
      title: "Rent",
      category: "Housing",
      on: "2026-03-05",
      amount: 700,
      repeat: "monthly",
      ...over,
    };
  }

  it("writes the new values onto the series when all is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      edited(),
      "all",
    );
    expect(stored("flows")).toHaveLength(1);
    expect(storedIn("flows", "rent")?.amount).toBe(700);
  });

  it("keeps the month the series started in, taking only the new day", async () => {
    const loaded = await store([rent]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      edited({ on: "2026-03-12" }),
      "all",
    );
    expect(storedIn("flows", "rent")?.on_date).toBe("2026-01-12");
  });

  it("does not resurrect a date that was skipped before", async () => {
    const loaded = await store([{ ...rent, skips: ["2026-02-05"] }]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      edited(),
      "all",
    );
    expect(storedIn("flows", "rent")?.skips).toEqual(["2026-02-05"]);
  });

  it("splits out a single one off when one is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      edited(),
      "one",
    );

    expect(storedIn("flows", "rent")?.skips).toEqual(["2026-03-05"]);
    const extra = stored("flows").find((one) => one.id !== "rent");
    expect(extra).toMatchObject({
      recur: "once",
      on_date: "2026-03-05",
      amount: 700,
    });
  });

  it("starts a second series when following is chosen", async () => {
    const loaded = await store([rent]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-03-05",
      edited(),
      "following",
    );

    expect(storedIn("flows", "rent")?.until_on).toBe("2026-03-04");
    const extra = stored("flows").find((one) => one.id !== "rent");
    expect(extra).toMatchObject({
      recur: "monthly",
      on_date: "2026-03-05",
      amount: 700,
    });
    expect(extra?.until_on).toBeNull();
    expect(extra?.skips).toEqual([]);
  });

  it("replaces the row outright when following starts at the very first one", async () => {
    const loaded = await store([rent]);
    await loaded.saveOccurrence(
      loaded.getSnapshot()[0],
      "2026-01-05",
      edited({ on: "2026-01-05" }),
      "following",
    );
    expect(stored("flows")).toHaveLength(1);
    expect(stored("flows")[0].id).not.toBe("rent");
  });
});
