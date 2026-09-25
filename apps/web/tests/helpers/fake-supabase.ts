export type FakeRow = Record<string, unknown>;

type State = {
  tables: Record<string, FakeRow[]>;
  failOn: Set<string>;
  calls: string[];
};

const KEY = Symbol.for("lifeos.fake.supabase");

function state(): State {
  const holder = globalThis as unknown as Record<symbol, State | undefined>;
  holder[KEY] ??= { tables: {}, failOn: new Set(), calls: [] };
  return holder[KEY];
}

function table(name: string): FakeRow[] {
  const db = state();
  db.tables[name] ??= [];
  return db.tables[name];
}

export function resetDb(
  events: FakeRow[] = [],
  users: FakeRow[] = [{ id: "u1" }],
): void {
  const db = state();
  db.tables = {
    users: users.map((r) => ({ ...r })),
    events: events.map((r) => ({ ...r })),
  };
  db.failOn = new Set();
  db.calls = [];
}

export function seed(name: string, rows: FakeRow[]): void {
  state().tables[name] = rows.map((r) => ({ ...r }));
}

export function stored(name: string): FakeRow[] {
  return table(name);
}

export function storedIn(name: string, id: string): FakeRow | undefined {
  return table(name).find((r) => r.id === id);
}

export function storedEvents(): FakeRow[] {
  return table("events");
}

export function storedEvent(id: string): FakeRow | undefined {
  return storedIn("events", id);
}

export function calls(): string[] {
  return state().calls;
}

export function failOn(op: string): void {
  state().failOn.add(op);
}

export function row(over: FakeRow = {}): FakeRow {
  return {
    id: "e1",
    user_id: "u1",
    type: "general",
    title: "Gym",
    start_at: "2026-03-02T09:00:00.000Z",
    end_at: "2026-03-02T10:00:00.000Z",
    all_day: false,
    color: null,
    notes: null,
    series_id: null,
    recurrence: null,
    occurrence_date: null,
    cancelled: false,
    data: {},
    ...over,
  };
}

type Result = { data: unknown; error: { message: string } | null };

type Query = {
  select(): Query;
  insert(value: FakeRow | FakeRow[]): Query;
  update(value: FakeRow): Query;
  delete(): Query;
  eq(column: string, value: unknown): Query;
  in(column: string, values: unknown[]): Query;
  single(): Query;
  then<T>(
    resolve: (value: Result) => T,
    reject?: (reason: unknown) => T,
  ): Promise<T>;
};

function query(name: string): Query {
  const db = state();
  let op = "select";
  let payload: FakeRow[] = [];
  let one = false;
  const filters: Array<(r: FakeRow) => boolean> = [];

  function run(): Result {
    const label = `${op} ${name}`;
    db.calls.push(label);
    if (db.failOn.has(label) || db.failOn.has(op)) {
      return { data: null, error: { message: `${label} refused` } };
    }

    const all = table(name);
    const hit = all.filter((r) => filters.every((f) => f(r)));

    if (op === "select") {
      return { data: one ? (hit[0] ?? null) : hit, error: null };
    }
    if (op === "insert") {
      for (const r of payload) all.push({ ...r });
      return { data: payload, error: null };
    }
    if (op === "update") {
      for (const r of hit) Object.assign(r, payload[0]);
      return { data: hit, error: null };
    }
    db.tables[name] = all.filter((r) => !hit.includes(r));
    return { data: hit, error: null };
  }

  const api: Query = {
    select(): Query {
      op = "select";
      return api;
    },
    insert(value: FakeRow | FakeRow[]): Query {
      op = "insert";
      payload = Array.isArray(value) ? value : [value];
      return api;
    },
    update(value: FakeRow): Query {
      op = "update";
      payload = [value];
      return api;
    },
    delete(): Query {
      op = "delete";
      return api;
    },
    eq(column: string, value: unknown): Query {
      filters.push((r) => r[column] === value);
      return api;
    },
    in(column: string, values: unknown[]): Query {
      filters.push((r) => values.includes(r[column]));
      return api;
    },
    single(): Query {
      one = true;
      return api;
    },
    then<T>(
      resolve: (value: Result) => T,
      reject?: (reason: unknown) => T,
    ): Promise<T> {
      return Promise.resolve(run()).then(resolve, reject);
    },
  };

  return api;
}

export const client = {
  from(name: string) {
    return query(name);
  },
};
