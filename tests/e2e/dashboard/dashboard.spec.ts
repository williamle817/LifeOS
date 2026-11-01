import {
  at,
  categoryRow,
  courseRow,
  dayOf,
  eventRow,
  expect,
  flowRow,
  gradeItemRow,
  semesterRow,
  test,
} from "../support/fixtures";

function fromToday(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

test("lists today's events and nothing else", async ({ app, page }) => {
  const now = fromToday(0);
  app.db.events.push(
    eventRow({ id: "a", title: "Dentist", start_at: at(now, 15), end_at: at(now, 16) }),
    eventRow({
      id: "b",
      title: "Birthday",
      all_day: true,
      start_at: dayOf(now),
      end_at: dayOf(fromToday(1)),
    }),
    eventRow({
      id: "c",
      title: "Yesterday's lunch",
      start_at: at(fromToday(-1), 12),
      end_at: at(fromToday(-1), 13),
    }),
  );
  await app.open("/");

  const list = page
    .getByRole("region", { name: "Today" })
    .getByRole("list", { name: "Today's events" });
  await expect(list.getByText("Dentist")).toBeVisible();
  const rows = await list.getByRole("listitem").allTextContents();
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain("Birthday");
  expect(rows[1]).toContain("Dentist");
});

test("lists late and upcoming work across courses", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(
    courseRow(),
    courseRow({ id: "c2", code: "MATH 221", title: "Linear Algebra" }),
  );
  app.db.categories.push(categoryRow(), categoryRow({ id: "q", course_id: "c2" }));
  app.db.grade_items.push(
    gradeItemRow({ id: "a", title: "Essay", due_on: dayOf(fromToday(-3)) }),
    gradeItemRow({
      id: "b",
      course_id: "c2",
      category_id: "q",
      title: "Quiz 2",
      due_on: dayOf(fromToday(5)),
    }),
    gradeItemRow({ id: "c", title: "Marked", score: 90, due_on: dayOf(fromToday(1)) }),
    gradeItemRow({ id: "d", title: "Undated" }),
  );
  await app.open("/");

  const list = page.getByRole("list", { name: "Due and late work" });
  await expect(list.getByText("Essay")).toBeVisible();
  const rows = await list.getByRole("listitem").allTextContents();
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain("3 days late");
  expect(rows[1]).toContain("MATH 221");
  expect(rows[1]).toContain("in 5 days");
});

test("shows this month's income and the next three charges", async ({
  app,
  page,
}) => {
  const now = fromToday(0);
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  app.db.flows = [
    flowRow({ id: "p", kind: "income", title: "Paycheck", amount: 2100, on_date: dayOf(first) }),
    flowRow({ id: "g", title: "Groceries", amount: 40, on_date: dayOf(fromToday(-1)) }),
    flowRow({ id: "a", title: "Phone bill", amount: 30, on_date: dayOf(fromToday(2)) }),
    flowRow({ id: "b", title: "Netflix", amount: 15.49, on_date: dayOf(fromToday(1)) }),
    flowRow({ id: "c", title: "Gym", amount: 25, on_date: dayOf(fromToday(3)) }),
    flowRow({ id: "d", title: "Insurance", amount: 80, on_date: dayOf(fromToday(4)) }),
  ];
  app.db.events.push(
    eventRow({
      id: "w",
      type: "work",
      title: "Cafe shift",
      start_at: at(now, 8),
      end_at: at(now, 12),
      data: { wage: 18 },
    }),
  );
  await app.open("/");

  const panel = page.getByRole("region", { name: "Finance" });
  await expect(panel.getByText("$2,172.00")).toBeVisible();
  await expect(panel.getByText("Paycheck")).toHaveCount(0);

  const charges = panel.getByRole("list", { name: "Charges coming up" });
  await expect(charges.getByText("Netflix")).toBeVisible();
  const rows = await charges.getByRole("listitem").allTextContents();
  expect(rows).toHaveLength(3);
  expect(rows[0]).toContain("Netflix");
  expect(rows[0]).toContain("tomorrow");
  expect(rows[1]).toContain("Phone bill");
  expect(rows[2]).toContain("Gym");
});
