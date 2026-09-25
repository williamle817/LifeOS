import {
  at,
  columnBox,
  dayOf,
  dragBlock,
  dragBy,
  dragSlots,
  eventRow,
  expect,
  laneBox,
  monday,
  test,
} from "./fixtures";

function today(): string {
  return dayOf(new Date());
}

function minutesOf(iso: string): number {
  return new Date(iso).getMinutes();
}

function hoursOf(iso: string): number {
  return new Date(iso).getHours();
}

test("dragging an empty slot opens the form", async ({ calendar, page }) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("New event")).toBeVisible();
});

test("shows a placeholder block while the form is open", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await expect(page.getByText("(Title)")).toBeVisible();
});

test("saves the dragged range as a new event", async ({ calendar, page }) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await page.getByLabel("Title").fill("Deep work");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Deep work")).toBeVisible();
  expect(calendar.db.events).toHaveLength(1);
  expect(hoursOf(calendar.db.events[0].start_at as string)).toBe(10);
  expect(hoursOf(calendar.db.events[0].end_at as string)).toBe(11);
});

test("writes nothing when the form is cancelled", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await page.getByRole("button", { name: "Cancel" }).click();

  expect(calendar.db.events).toHaveLength(0);
  await expect(page.getByText("(Title)")).toHaveCount(0);
});

test("snaps a short drag to a quarter of an hour", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  const lane = await laneBox(page, "10:00:00");
  await dragBy(page, today(), "10:00:00", lane.height * 0.4);

  await page.getByLabel("Title").fill("Quick call");
  await page.getByRole("button", { name: "Save" }).click();

  const row = calendar.db.events[0];
  expect(hoursOf(row.start_at as string)).toBe(10);
  expect(minutesOf(row.start_at as string)).toBe(0);
  expect(minutesOf(row.end_at as string)).toBe(15);
});

test("moving a plain event saves the new time straight away", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      title: "Coffee",
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await dragBlock(page, "Coffee", dayOf(start), "14:00:00");

  await expect
    .poll(() => hoursOf(calendar.db.events[0].start_at as string))
    .toBe(14);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("moving one occurrence of a series asks which occurrences", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await dragBlock(page, "Standup", dayOf(start), "14:00:00");

  await expect(page.getByText("Change repeating event")).toBeVisible();
  expect(calendar.db.events).toHaveLength(1);
});

test("leaves the dragged block at the new time while it asks", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  const before = (await page.getByText("Standup").first().boundingBox())!;
  await dragBlock(page, "Standup", dayOf(start), "14:00:00");
  const during = (await page.getByText("Standup").first().boundingBox())!;

  expect(during.y).toBeGreaterThan(before.y + 20);
});

test("puts the block back when the question is cancelled", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  const before = (await page.getByText("Standup").first().boundingBox())!;
  await dragBlock(page, "Standup", dayOf(start), "14:00:00");
  await page.getByRole("button", { name: "Cancel" }).click();

  const after = (await page.getByText("Standup").first().boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(4);
  expect(calendar.db.events).toHaveLength(1);
  expect(hoursOf(calendar.db.events[0].start_at as string)).toBe(9);
});

test("applies the chosen scope to a dragged occurrence", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await dragBlock(page, "Standup", dayOf(start), "14:00:00");
  await page.getByRole("button", { name: "This event" }).click();

  await expect.poll(() => calendar.db.events.length).toBe(2);
  const patch = calendar.db.events[1];
  expect(patch.occurrence_date).toBe(dayOf(start));
  expect(patch.recurrence).toBeNull();
});

test("leaves room on the right of a week view block", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({ title: "Coffee", start_at: at(start, 9), end_at: at(start, 10) }),
  );
  await calendar.open();

  const block = (await page.locator(".fc-timegrid-event").first().boundingBox())!;
  const column = await columnBox(page, dayOf(start));

  expect(block.width).toBeLessThan(column.width * 0.92);
  expect(block.width).toBeGreaterThan(column.width * 0.7);
});
