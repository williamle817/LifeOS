import {
  categoryRow,
  courseRow,
  expect,
  gradeItemRow,
  semesterRow,
  test,
} from "../support/fixtures";

test("a second tab catches up when you switch back to it", async ({
  app,
  page,
  context,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "i1", title: "Midterm" }));

  await app.open("/academic");
  await expect(page.getByText("Midterm")).toBeVisible();

  const second = await context.newPage();
  await second.goto("http://localhost:3100/academic");
  await expect(second.getByText("Midterm")).toBeVisible();

  await page.getByRole("button", { name: "Remove Midterm" }).click();
  await expect.poll(() => app.db.grade_items.length).toBe(0);

  await second.bringToFront();
  await second.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(second.getByText("Midterm")).toHaveCount(0);
});

test("a tab left alone keeps what it had until you come back", async ({
  app,
  page,
  context,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "i1", title: "Midterm" }));

  await app.open("/academic");
  const second = await context.newPage();
  await second.goto("http://localhost:3100/academic");
  await expect(second.getByText("Midterm")).toBeVisible();

  await page.getByRole("button", { name: "Remove Midterm" }).click();
  await expect.poll(() => app.db.grade_items.length).toBe(0);

  await expect(second.getByText("Midterm")).toBeVisible();
});
