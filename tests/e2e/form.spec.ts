import {
  at,
  dayOf,
  dragSlots,
  eventRow,
  expect,
  monday,
  test,
} from "./fixtures";

function today(): string {
  return dayOf(new Date());
}

function weeksBefore(weeks: number): Date {
  const d = monday();
  d.setDate(d.getDate() - weeks * 7);
  return d;
}

test("creates an all day event from the top row", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await page.locator(`.fc-daygrid-day[data-date="${today()}"]`).click();

  await expect(page.getByLabel("Start")).toHaveAttribute("type", "date");
  await page.getByLabel("Title").fill("Birthday");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Birthday")).toBeVisible();
  expect(calendar.db.events[0].all_day).toBe(true);
  expect(calendar.db.events[0].start_at).toBe(today());
});

test("keeps notes with line breaks and shows them again", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await page.getByLabel("Title").fill("Groceries");
  await page.getByLabel("Notes").fill("milk\neggs");
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByText("Groceries").click();
  const card = page.getByRole("dialog");
  await expect(card.getByText("milk", { exact: false })).toContainText("eggs");
  expect(calendar.db.events[0].notes).toBe("milk\neggs");
});

test("creates a weekly series from the form", async ({ calendar, page }) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await page.getByLabel("Title").fill("Piano");
  await page.getByLabel("Repeat").selectOption("weekly");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Piano")).toHaveCount(1);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  expect(await page.getByText("Piano").count()).toBeGreaterThan(1);
  expect(calendar.db.events).toHaveLength(1);
});

test("creates a custom series on chosen weekdays", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  await page.getByLabel("Title").fill("Gym");
  await page.getByLabel("Repeat").selectOption("custom-open");
  await expect(page.getByText("Custom repeat")).toBeVisible();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "W", exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect
    .poll(() => (calendar.db.events[0]?.recurrence as { byDay?: number[] })?.byDay)
    .toEqual([1, 3]);
});

test("editing all events keeps every earlier occurrence", async ({
  calendar,
  page,
}) => {
  const start = weeksBefore(3);
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
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const before = await page.getByText("Standup").count();
  expect(before).toBeGreaterThan(2);

  await page.getByText("Standup").nth(2).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Daily sync");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "All events" }).click();

  await expect(page.getByText("Daily sync")).toHaveCount(before);
  expect(calendar.db.events).toHaveLength(1);
});

test("editing one occurrence leaves the others alone", async ({
  calendar,
  page,
}) => {
  const start = weeksBefore(2);
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
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const before = await page.getByText("Standup").count();
  await page.getByText("Standup").nth(1).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Skipped once");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "This event" }).click();

  await expect(page.getByText("Skipped once")).toHaveCount(1);
  await expect(page.getByText("Standup")).toHaveCount(before - 1);
  expect(calendar.db.events).toHaveLength(2);
});

test("splitting a series keeps the part before the split", async ({
  calendar,
  page,
}) => {
  const start = weeksBefore(3);
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
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const before = await page.getByText("Standup").count();
  await page.getByText("Standup").nth(2).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("New name");
  await page.getByRole("button", { name: "Save" }).click();
  await page
    .getByRole("button", { name: "This and following events" })
    .click();

  await expect(page.getByText("Standup")).toHaveCount(2);
  await expect(page.getByText("New name")).toHaveCount(before - 2);
  expect(calendar.db.events).toHaveLength(2);
});

test("shows the rule again when a repeating event is reopened", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 2, byDay: [1, 3] },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await page.getByText("Standup").first().click();
  await page.getByRole("button", { name: "Edit" }).click();

  await expect(page.getByLabel("Repeat")).toHaveValue("custom");
  await page.getByLabel("Repeat").selectOption("custom-open");
  await expect(
    page.getByRole("button", { name: "M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("refuses an end time before the start time", async ({
  calendar,
  page,
}) => {
  await calendar.open();
  await dragSlots(page, today(), "10:00:00", "11:00:00");

  const start = await page.getByLabel("Start").inputValue();
  await expect(page.getByLabel("End")).toHaveAttribute("min", start);
});
