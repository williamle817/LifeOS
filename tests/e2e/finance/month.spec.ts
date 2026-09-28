import { expect, flowRow, test } from "../support/fixtures";

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

test("drags one entry above another on the same day", async ({
  app,
  page,
}) => {
  const now = thisMonth();
  app.db.flows = [
    flowRow({
      id: "first",
      kind: "income",
      title: "Morning shift",
      on_date: now.day(4),
      position: 0,
    }),
    flowRow({
      id: "second",
      kind: "income",
      title: "Evening shift",
      on_date: now.day(4),
      position: 1,
    }),
  ];

  await app.open("/finance");

  const rows = page.getByRole("region", { name: "Income" }).getByRole("listitem");
  await expect(rows.first()).toContainText("Morning shift");

  const grip = page.locator('[data-reorder="Evening shift"]');
  const from = await grip.boundingBox();
  const target = await rows.first().boundingBox();
  if (!from || !target) throw new Error("no rows to drag");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2,
    target.y + target.height / 2 - 4,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(rows.first()).toContainText("Evening shift");
  expect(
    app.db.flows.find((one) => one.id === "second")?.position,
  ).toBe(0);
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
