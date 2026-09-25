import { at, eventRow, expect, monday, test } from "../support/fixtures";

test("shows the week view with the seeded event", async ({
  calendar,
  page,
}) => {
  calendar.db.events.push(eventRow({ title: "Morning gym" }));
  await calendar.open();

  await expect(page.getByText("Morning gym")).toBeVisible();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toBeVisible();
});

test("opens the details card when a block is clicked", async ({
  calendar,
  page,
}) => {
  calendar.db.events.push(
    eventRow({ title: "Morning gym", notes: "bring shoes" }),
  );
  await calendar.open();

  await page.getByText("Morning gym").click();

  const card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  await expect(card.getByText("bring shoes")).toBeVisible();
  await expect(card.getByText("9:00 AM - 10:00 AM")).toBeVisible();
});

test("edits a title from the details card", async ({ calendar, page }) => {
  calendar.db.events.push(eventRow({ title: "Morning gym" }));
  await calendar.open();

  await page.getByText("Morning gym").click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Evening gym");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Evening gym")).toBeVisible();
  expect(calendar.db.events[0].title).toBe("Evening gym");
});

test("deletes a plain event without asking which occurrences", async ({
  calendar,
  page,
}) => {
  calendar.db.events.push(eventRow({ title: "Morning gym" }));
  await calendar.open();

  await page.getByText("Morning gym").click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Morning gym")).toHaveCount(0);
  expect(calendar.db.events).toHaveLength(0);
});

test("puts a deleted event back with control z", async ({
  calendar,
  page,
}) => {
  calendar.db.events.push(eventRow({ title: "Morning gym" }));
  await calendar.open();

  await page.getByText("Morning gym").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Morning gym")).toHaveCount(0);

  await page.keyboard.press("Control+z");

  await expect(page.getByText("Morning gym")).toBeVisible();
  expect(calendar.db.events).toHaveLength(1);
});

test("shows every occurrence of a weekly series", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Weekly standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await expect(page.getByText("Weekly standup")).toHaveCount(1);

  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(
    page.getByText("Weekly standup").first(),
  ).toBeVisible();
  expect(await page.getByText("Weekly standup").count()).toBeGreaterThan(2);
});

test("asks which occurrences before deleting from a series", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Weekly standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();

  await page.getByText("Weekly standup").click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Delete repeating event")).toBeVisible();
  await page.getByRole("button", { name: "This event" }).click();

  await expect(page.getByText("Weekly standup")).toHaveCount(0);
  expect(calendar.db.events).toHaveLength(2);
  expect(calendar.db.events[1].cancelled).toBe(true);
});

test("ends a series from one occurrence onward", async ({
  calendar,
  page,
}) => {
  const start = monday();
  calendar.db.events.push(
    eventRow({
      id: "s1",
      title: "Weekly standup",
      series_id: "s1",
      recurrence: { freq: "weekly", interval: 1 },
      start_at: at(start, 9),
      end_at: at(start, 10),
    }),
  );
  await calendar.open();
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const before = await page.getByText("Weekly standup").count();
  await page.getByText("Weekly standup").nth(2).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("button", { name: "This and following events" })
    .click();

  await expect(page.getByText("Weekly standup")).toHaveCount(2);
  expect(before).toBeGreaterThan(2);
  expect(
    (calendar.db.events[0].recurrence as { until?: string }).until,
  ).toBeTruthy();
});

test("switches between day, week and month", async ({ calendar, page }) => {
  calendar.db.events.push(eventRow({ title: "Morning gym" }));
  await calendar.open();

  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();

  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();

  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".fc-timeGridWeek-view")).toBeVisible();
});

test("shows the sign in form when there is no session", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByText("Sign in to LifeOS")).toBeVisible();
});
