import { test as base, expect, type Page } from "@playwright/test";

export type Row = Record<string, unknown>;

export type Db = { events: Row[] };

export const STORAGE_KEY = "sb-localhost-auth-token";

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function session() {
  const now = Math.floor(Date.now() / 1000);
  const token = [
    base64url({ alg: "HS256", typ: "JWT" }),
    base64url({
      sub: "auth-1",
      aud: "authenticated",
      role: "authenticated",
      email: "e2e@lifeos.test",
      iat: now,
      exp: now + 3600,
    }),
    "e2e-signature",
  ].join(".");

  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "e2e-refresh",
    user: {
      id: "auth-1",
      aud: "authenticated",
      role: "authenticated",
      email: "e2e@lifeos.test",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dayOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function at(day: Date, hour: number, minute = 0): string {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function eventRow(over: Row = {}): Row {
  const start = monday();
  return {
    id: "seed-1",
    user_id: "u1",
    type: "general",
    title: "Seeded",
    start_at: at(start, 9),
    end_at: at(start, 10),
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

function matches(row: Row, url: URL): boolean {
  for (const [key, raw] of url.searchParams) {
    if (key === "select" || key === "order" || key === "limit") continue;
    if (raw.startsWith("eq.")) {
      if (row[key] !== raw.slice(3)) return false;
      continue;
    }
    if (raw.startsWith("in.")) {
      const list = raw
        .slice(3)
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((v) => v.replace(/^"|"$/g, ""));
      if (!list.includes(String(row[key]))) return false;
    }
  }
  return true;
}

async function installRoutes(page: Page, db: Db): Promise<void> {
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({ status: 200, json: session() }),
  );

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").pop();
    const wantsOne = (request.headers()["accept"] ?? "").includes(
      "pgrst.object",
    );

    if (table === "users") {
      const me = { id: "u1", auth_id: "auth-1" };
      return route.fulfill({ status: 200, json: wantsOne ? me : [me] });
    }

    if (table !== "events") {
      return route.fulfill({ status: 200, json: [] });
    }

    const method = request.method();

    if (method === "GET") {
      return route.fulfill({ status: 200, json: db.events });
    }

    if (method === "POST") {
      const body = request.postDataJSON();
      const rows = Array.isArray(body) ? body : [body];
      for (const row of rows) db.events.push({ ...row });
      return route.fulfill({ status: 201, json: rows });
    }

    if (method === "PATCH") {
      const patch = request.postDataJSON() as Row;
      const hit = db.events.filter((row) => matches(row, url));
      for (const row of hit) Object.assign(row, patch);
      return route.fulfill({ status: 200, json: hit });
    }

    if (method === "DELETE") {
      const hit = db.events.filter((row) => matches(row, url));
      db.events = db.events.filter((row) => !hit.includes(row));
      return route.fulfill({ status: 200, json: hit });
    }

    return route.fulfill({ status: 200, json: [] });
  });
}

export type Calendar = {
  db: Db;
  open: (path?: string) => Promise<void>;
  titles: () => Promise<string[]>;
  blocks: () => ReturnType<Page["locator"]>;
};

export async function laneBox(page: Page, time: string) {
  const lane = page.locator(`.fc-timegrid-slot-lane[data-time="${time}"]`).first();
  await lane.scrollIntoViewIfNeeded();
  const box = await lane.boundingBox();
  if (!box) throw new Error(`no lane at ${time}`);
  return box;
}

export async function columnBox(page: Page, day: string) {
  const col = page
    .locator(`.fc-timegrid-body .fc-timegrid-col[data-date="${day}"]`)
    .first();
  const box = await col.boundingBox();
  if (!box) throw new Error(`no column for ${day}`);
  return box;
}

export async function dragSlots(
  page: Page,
  day: string,
  from: string,
  to: string,
): Promise<void> {
  const start = await laneBox(page, from);
  const end = await laneBox(page, to);
  const col = await columnBox(page, day);
  const x = col.x + col.width / 2;
  await page.mouse.move(x, start.y + 2);
  await page.mouse.down();
  await page.mouse.move(x, end.y + 2, { steps: 10 });
  await page.mouse.up();
}

export async function dragBy(
  page: Page,
  day: string,
  from: string,
  pixels: number,
): Promise<void> {
  const start = await laneBox(page, from);
  const col = await columnBox(page, day);
  const x = col.x + col.width / 2;
  await page.mouse.move(x, start.y + 2);
  await page.mouse.down();
  await page.mouse.move(x, start.y + 2 + pixels, { steps: 10 });
  await page.mouse.up();
}

export async function dragBlock(
  page: Page,
  title: string,
  day: string,
  to: string,
): Promise<void> {
  const block = page.getByText(title).first();
  await block.scrollIntoViewIfNeeded();
  const from = await block.boundingBox();
  const end = await laneBox(page, to);
  const col = await columnBox(page, day);
  if (!from) throw new Error(`no block called ${title}`);
  await page.mouse.move(from.x + from.width / 2, from.y + 2);
  await page.mouse.down();
  await page.mouse.move(col.x + col.width / 2, end.y + 2, { steps: 12 });
  await page.mouse.up();
}

export const test = base.extend<{ calendar: Calendar }>({
  calendar: async ({ page }, use) => {
    const db: Db = { events: [] };
    const stored = JSON.stringify(session());

    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key as string, value as string);
      },
      [STORAGE_KEY, stored],
    );
    await installRoutes(page, db);

    await use({
      db,
      open: async (path = "/schedule") => {
        await page.goto(path);
        await page.waitForSelector(".fc-view-harness");
      },
      titles: async () =>
        page.locator(".fc-event-title, .fc-event .font-medium").allTextContents(),
      blocks: () => page.locator(".fc-event"),
    });
  },
});

export { expect };
