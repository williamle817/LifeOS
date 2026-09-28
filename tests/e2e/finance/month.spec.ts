import { eventRow, expect, flowRow, test } from "../support/fixtures";

function thisMonth(offset = 0): { label: string; day: (n: number) => string } {
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return {
    label: at.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    day: (n: number) =>
      `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
        n,
      ).padStart(2, "0")}`,
  };
}

test("opens on this month and shows what falls in it", async ({
  app,
  page,
}) => {
  const now = thisMonth();
  const next = thisMonth(1);

  app.db.flows = [
    flowRow({ id: "a", title: "Groceries", amount: 40, on_date: now.day(4) }),
    flowRow({
      id: "b",
      kind: "income",
      title: "Working shift",
      amount: 120,
      on_date: now.day(6),
    }),
    flowRow({ id: "c", title: "Next month", on_date: next.day(3) }),
  ];

  await app.open("/finance");

  await expect(page.getByRole("heading", { name: now.label })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Income" }).getByText("Working shift"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Expenses" }).getByText("Groceries"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Expenses" }).getByText("Next month"),
  ).toHaveCount(0);

  await expect(
    page.getByRole("img", { name: /Income \$120\.00, expenses \$40\.00/ }),
  ).toBeVisible();
});

test("walks to another month and back", async ({ app, page }) => {
  const now = thisMonth();
  const back = thisMonth(-1);

  app.db.flows = [
    flowRow({ id: "c", title: "Last month", on_date: back.day(3) }),
  ];
  const expenses = page.getByRole("region", { name: "Expenses" });

  await app.open("/finance");
  await expect(expenses.getByText("Last month")).toHaveCount(0);

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { name: back.label })).toBeVisible();
  await expect(expenses.getByText("Last month")).toBeVisible();

  await page.getByRole("button", { name: "This month" }).click();
  await expect(page.getByRole("heading", { name: now.label })).toBeVisible();
});

test("a monthly entry comes back every month", async ({ app, page }) => {
  const back = thisMonth(-1);
  const further = thisMonth(-2);

  app.db.flows = [
    flowRow({
      id: "sub",
      title: "Netflix",
      amount: 15,
      on_date: further.day(5),
      recur: "monthly",
    }),
  ];

  const expenses = page.getByRole("region", { name: "Expenses" });

  await app.open("/finance");
  await expect(expenses.getByText("Netflix")).toBeVisible();

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { name: back.label })).toBeVisible();
  await expect(expenses.getByText("Netflix")).toBeVisible();

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(
    page.getByRole("heading", { name: further.label }),
  ).toBeVisible();
  await expect(expenses.getByText("Netflix")).toBeVisible();
});

test("adds an expense and keeps it", async ({ app, page }) => {
  await app.open("/finance");

  await page.getByRole("button", { name: "Add expense" }).click();
  await page.getByLabel("Expenses name").fill("Coffee");
  await page.getByLabel("Expenses location").fill("The cafe");
  await page.getByLabel("Expenses amount").fill("4.5");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("-$4.50")).toBeVisible();
  expect(app.db.flows).toHaveLength(1);
  expect(app.db.flows[0]).toMatchObject({
    kind: "expense",
    title: "Coffee",
    place: "The cafe",
    amount: 4.5,
    recur: "once",
  });

  await page.reload();
  await expect(page.getByText("Coffee")).toBeVisible();
});

test("edits and then removes an entry", async ({ app, page }) => {
  const now = thisMonth();
  app.db.flows = [
    flowRow({ id: "a", title: "Groceries", amount: 40, on_date: now.day(4) }),
  ];

  await app.open("/finance");

  await page.getByRole("button", { name: "Edit Groceries" }).click();
  await page.getByLabel("Expenses amount").fill("55");
  await page.getByRole("button", { name: "Save" }).click();

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("-$55.00")).toBeVisible();
  expect(app.db.flows[0].amount).toBe(55);

  await page.getByRole("button", { name: "Remove Groceries" }).click();
  await expect(page.getByText("Nothing in expenses this month")).toBeVisible();
  expect(app.db.flows).toHaveLength(0);
});

test("files an expense under a type", async ({ app, page }) => {
  await app.open("/finance");

  await page.getByRole("button", { name: "Add expense" }).click();
  await page.getByLabel("Expenses name").fill("Netflix");
  await page.getByLabel("Expenses type").selectOption("Subscription");
  await page.getByLabel("Expenses amount").fill("15");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(
    page
      .getByRole("region", { name: "Expenses" })
      .getByRole("listitem")
      .getByText(/Subscription/),
  ).toBeVisible();
  expect(app.db.flows[0].category).toBe("Subscription");
});

test("warns about a subscription without counting it as spent", async ({
  app,
  page,
}) => {
  const next = thisMonth(1);

  app.db.flows = [
    flowRow({
      id: "sub",
      title: "Netflix",
      amount: 15,
      on_date: next.day(14),
      recur: "monthly",
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { name: next.label })).toBeVisible();

  const strip = page.getByLabel("Coming up");
  await expect(strip.getByText("Netflix")).toBeVisible();

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("Netflix")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /expenses \$0\.00/ }),
  ).toBeVisible();
});

test("asks which entries before removing a repeating one", async ({
  app,
  page,
}) => {
  const now = thisMonth();
  const back = thisMonth(-2);

  app.db.flows = [
    flowRow({
      id: "rent",
      title: "Rent",
      amount: 650,
      on_date: back.day(1),
      recur: "monthly",
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Remove Rent" }).click();

  const ask = page.getByRole("dialog", { name: "Apply to" });
  await expect(ask).toBeVisible();
  await ask.getByText("This entry").click();

  await expect(page.getByText("Nothing in expenses this month")).toBeVisible();
  expect(app.db.flows).toHaveLength(1);
  expect(app.db.flows[0].skips).toEqual([now.day(1)]);

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(
    page.getByRole("region", { name: "Expenses" }).getByText("Rent"),
  ).toBeVisible();
});

test("splits a repeating entry when only this one is changed", async ({
  app,
  page,
}) => {
  const now = thisMonth();
  const back = thisMonth(-2);

  app.db.flows = [
    flowRow({
      id: "rent",
      title: "Rent",
      amount: 650,
      on_date: back.day(1),
      recur: "monthly",
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Edit Rent" }).click();
  await page.getByLabel("Expenses amount").fill("700");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("dialog", { name: "Apply to" }).getByText("This entry").click();

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("-$700.00")).toBeVisible();

  expect(app.db.flows).toHaveLength(2);
  const series = app.db.flows.find((one) => one.id === "rent");
  expect(series?.skips).toEqual([now.day(1)]);
  expect(series?.amount).toBe(650);
});

test("says nothing about what is coming when nothing is", async ({
  app,
  page,
}) => {
  await app.open("/finance");
  await expect(page.getByLabel("Coming up")).toHaveCount(0);
});

function shiftAt(day: number, hour: number, minute = 0): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute).toISOString();
}

test("counts a work shift from the calendar as income", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(3, 9),
      end_at: shiftAt(3, 14),
      data: { place: "The cafe", wage: 20, tips: 15 },
    }),
  ];

  await app.open("/finance");

  const incomes = page.getByRole("region", { name: "Income" });
  await expect(incomes.getByText("Working shift")).toBeVisible();
  await expect(incomes.getByText("+$115.00")).toBeVisible();
  await expect(incomes.getByText(/The cafe/)).toBeVisible();
  await expect(incomes.getByText(/from Schedule/)).toBeVisible();

  await expect(
    page.getByRole("img", { name: /Income \$115\.00/ }),
  ).toBeVisible();
});

test("editing a shift here writes to the calendar event", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(3, 9),
      end_at: shiftAt(3, 14),
      data: { place: "The cafe", wage: 20 },
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Edit Working shift" }).click();

  await expect(page.getByLabel("Income amount")).toHaveCount(0);
  await expect(page.getByLabel("Income date")).toHaveCount(0);

  await page.getByLabel("Income name").fill("Night shift");
  await page.getByLabel("Income location").fill("The bar");
  await page.getByRole("button", { name: "Save" }).click();

  const incomes = page.getByRole("region", { name: "Income" });
  await expect(incomes.getByText("Night shift")).toBeVisible();
  await expect(incomes.getByText(/The bar/)).toBeVisible();

  expect(app.db.events[0].title).toBe("Night shift");
  expect(app.db.events[0].data).toMatchObject({ place: "The bar" });
  expect(app.db.flows).toHaveLength(0);
});

test("removing a one off shift takes the event with it", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(3, 9),
      end_at: shiftAt(3, 14),
      data: { wage: 20 },
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Remove Working shift" }).click();
  await expect(page.getByText("Nothing in income this month")).toBeVisible();
  expect(app.db.events).toHaveLength(0);
});

test("asks which shifts before removing a repeating one", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(2, 9),
      end_at: shiftAt(2, 13),
      series_id: "e1",
      recurrence: { freq: "weekly", interval: 1 },
      data: { wage: 25 },
    }),
  ];

  await app.open("/finance");
  const incomes = page.getByRole("region", { name: "Income" });
  await expect(incomes.getByText("Working shift").first()).toBeVisible();
  const before = await incomes.getByText("Working shift").count();

  await page
    .getByRole("button", { name: "Remove Working shift" })
    .first()
    .click();

  const ask = page.getByRole("dialog", { name: "Apply to" });
  await expect(ask).toBeVisible();
  await ask.getByText("This entry").click();

  await expect(incomes.getByText("Working shift")).toHaveCount(before - 1);
  expect(app.db.events.length).toBeGreaterThan(1);
});

test("takes the whole series away when all is chosen", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(2, 9),
      end_at: shiftAt(2, 13),
      series_id: "e1",
      recurrence: { freq: "weekly", interval: 1 },
      data: { wage: 25 },
    }),
  ];

  await app.open("/finance");
  await expect(
    page.getByRole("region", { name: "Income" }).getByText("Working shift").first(),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Remove Working shift" })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Apply to" })
    .getByText("All entries")
    .click();

  await expect(page.getByText("Nothing in income this month")).toBeVisible();
  expect(app.db.events).toHaveLength(0);
});

test("adds a repeating shift up over the whole month", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(2, 9),
      end_at: shiftAt(2, 13),
      series_id: "e1",
      recurrence: { freq: "weekly", interval: 1 },
      data: { wage: 25 },
    }),
  ];

  await app.open("/finance");

  const incomes = page.getByRole("region", { name: "Income" });
  await expect(incomes.getByText("Working shift").first()).toBeVisible();
  const seen = await incomes.getByText("Working shift").count();
  expect(seen).toBeGreaterThan(3);
  await expect(incomes.getByText("+$100.00").first()).toBeVisible();
});

test("reads the newest date at the top", async ({ app, page }) => {
  const back = thisMonth(-1);

  app.db.flows = [
    flowRow({ id: "a", title: "Earliest", on_date: back.day(2) }),
    flowRow({ id: "b", title: "Latest", on_date: back.day(26) }),
    flowRow({ id: "c", title: "Middle", on_date: back.day(14) }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Previous month" }).click();

  const rows = page
    .getByRole("region", { name: "Expenses" })
    .getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  const names = await rows.allTextContents();
  expect(names[0]).toContain("Latest");
  expect(names[2]).toContain("Earliest");
});

test("counts a meal from the calendar as spending", async ({ app, page }) => {
  app.db.events = [
    eventRow({
      id: "d1",
      type: "dining",
      title: "Dinner",
      start_at: shiftAt(3, 19),
      end_at: shiftAt(3, 20),
      data: { place: "The noodle shop", amount: 24.5 },
    }),
  ];

  await app.open("/finance");

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("Dinner")).toBeVisible();
  await expect(expenses.getByText("-$24.50")).toBeVisible();
  await expect(expenses.getByText(/Dining out/)).toBeVisible();
  await expect(expenses.getByText(/The noodle shop/)).toBeVisible();

  await expect(
    page.getByRole("region", { name: "Income" }).getByText("Dinner"),
  ).toHaveCount(0);
});

test("shows a meal with no price yet as nothing spent", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "d1",
      type: "dining",
      title: "Dinner",
      start_at: shiftAt(3, 19),
      end_at: shiftAt(3, 20),
      data: { place: "The noodle shop" },
    }),
  ];

  await app.open("/finance");

  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(expenses.getByText("Dinner")).toBeVisible();
  await expect(expenses.getByText("-$0.00")).toBeVisible();
});

test("types the price of a meal in and it lands on the event", async ({
  app,
  page,
}) => {
  app.db.events = [
    eventRow({
      id: "d1",
      type: "dining",
      title: "Dinner",
      start_at: shiftAt(3, 19),
      end_at: shiftAt(3, 20),
      data: { place: "The noodle shop" },
    }),
  ];

  await app.open("/finance");
  await page.getByRole("button", { name: "Edit Dinner" }).click();
  await page.getByLabel("Expenses amount").fill("24.5");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByRole("region", { name: "Expenses" }).getByText("-$24.50"),
  ).toBeVisible();
  expect(app.db.events[0].data).toMatchObject({ amount: 24.5 });
  expect(app.db.flows).toHaveLength(0);
});

test("a shift with no tips still pays its wage", async ({ app, page }) => {
  app.db.events = [
    eventRow({
      id: "e1",
      type: "work",
      title: "Working shift",
      start_at: shiftAt(3, 9),
      end_at: shiftAt(3, 14),
      data: { wage: 20 },
    }),
  ];

  await app.open("/finance");
  await expect(
    page.getByRole("region", { name: "Income" }).getByText("+$100.00"),
  ).toBeVisible();
});
