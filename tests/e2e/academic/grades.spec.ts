import {
  categoryRow,
  courseRow,
  expect,
  gradeItemRow,
  semesterRow,
  test,
} from "../support/fixtures";

test("shows no grade until something is marked", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow());
  await app.open("/academic");

  await expect(page.getByText("Current grade")).toBeVisible();
  await expect(page.getByText("--").first()).toBeVisible();
  await expect(page.getByText(/Once one score is in/)).toBeVisible();
});

test("types a score in and watches the grade appear", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "m1", title: "Midterm" }));
  await app.open("/academic");

  await page.getByLabel("Midterm score").fill("84");

  await expect(page.getByText("84%").first()).toBeVisible();
  await expect(page.getByText("B").first()).toBeVisible();
  await expect.poll(() => app.db.grade_items[0].score).toBe(84);
});

test("does not let work that has not happened drag the grade down", async ({
  app,
  page,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "Midterm", score: 90 }),
    gradeItemRow({ id: "m2", title: "Final" }),
  );
  await app.open("/academic");

  await expect(page.getByText("90%").first()).toBeVisible();
  await expect(page.getByText("45").first()).toBeVisible();
});

test("adds an item from the syllabus", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "Add item to Exams" }).click();
  await page.getByLabel("Item name").fill("Quiz 1");
  await page.getByLabel("Out of").fill("20");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("Quiz 1")).toBeVisible();
  await expect(page.getByText("/ 20")).toBeVisible();
  await expect.poll(() => app.db.grade_items.length).toBe(1);
  expect(app.db.grade_items[0].score).toBeNull();
});

test("removes an item", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "m1", title: "Midterm" }));
  await app.open("/academic");

  await page.getByRole("button", { name: "Remove Midterm" }).click();

  await expect(page.getByText("Midterm")).toHaveCount(0);
  await expect.poll(() => app.db.grade_items.length).toBe(0);
});

test("drops the lowest quiz once the course says so", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow({ name: "Quizzes", drop_lowest: 1 }));
  app.db.grade_items.push(
    gradeItemRow({ id: "q1", title: "Quiz 1", score: 40 }),
    gradeItemRow({ id: "q2", title: "Quiz 2", score: 100 }),
  );
  await app.open("/academic");

  await expect(page.getByText("dropped")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();
});

test("lets extra credit carry the grade past a hundred", async ({
  app,
  page,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(
    categoryRow(),
    categoryRow({
      id: "bonus",
      name: "Bonus",
      weight: 5,
      extra_credit: true,
      position: 1,
    }),
  );
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "Midterm", score: 100 }),
    gradeItemRow({ id: "b1", title: "Survey", category_id: "bonus", score: 100 }),
  );
  await app.open("/academic");

  await expect(page.getByText("extra credit")).toBeVisible();
  await expect(page.getByText("105%").first()).toBeVisible();
});

test("draws the chance of each grade once a score exists", async ({
  app,
  page,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "Midterm", score: 95 }),
    gradeItemRow({ id: "m2", title: "Final" }),
  );
  await app.open("/academic");

  const chart = page.getByRole("list", { name: "Chance of each grade" });
  await expect(chart).toBeVisible();
  await expect(chart.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText(/cannot know that the final is harder/)).toBeVisible();
});

test("says an A is likely for a student holding high marks", async ({
  app,
  page,
}) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "One", score: 98 }),
    gradeItemRow({ id: "m2", title: "Two", score: 97 }),
    gradeItemRow({ id: "m3", title: "Three", score: 99 }),
    gradeItemRow({ id: "m4", title: "Four" }),
  );
  await app.open("/academic");

  const chart = page.getByRole("list", { name: "Chance of each grade" });
  const label = await chart
    .getByRole("listitem")
    .first()
    .getAttribute("aria-label");
  const chance = Number(label?.replace(/[^0-9.]/g, ""));
  expect(chance).toBeGreaterThan(90);
});

test("draws bars you can actually see", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "One", score: 95 }),
    gradeItemRow({ id: "m2", title: "Two" }),
  );
  await app.open("/academic");

  const chart = page.getByRole("list", { name: "Chance of each grade" });
  await expect(chart).toBeVisible();

  const tallest = await chart
    .locator("div[style*='height']")
    .first()
    .boundingBox();
  expect(tallest!.height).toBeGreaterThan(40);
});

test("does not call an A student an F", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(
    categoryRow({ id: "exams", name: "Exams", weight: 40 }),
    categoryRow({ id: "hw", name: "Homework", weight: 30, position: 1 }),
    categoryRow({ id: "quiz", name: "Quizzes", weight: 30, position: 2 }),
  );
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", category_id: "exams", title: "Exam 1", score: 95 }),
  );
  await app.open("/academic");

  await expect(page.getByText("most likely A")).toBeVisible();
  const f = await page
    .getByRole("listitem", { name: /^F / })
    .getAttribute("aria-label");
  expect(Number(f?.replace(/[^0-9.]/g, ""))).toBeLessThan(5);
});

test("fixes an item typed in wrong", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "m1", title: "Midtrem", max_score: 40 }),
  );
  await app.open("/academic");

  await page.getByRole("button", { name: "Edit Midtrem" }).click();
  await page.getByLabel("Item name").fill("Midterm");
  await page.getByLabel("Out of").fill("50");
  await page.getByLabel("Due date").fill("2026-11-05");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Midterm")).toBeVisible();
  await expect(page.getByText("/ 50")).toBeVisible();
  await expect.poll(() => app.db.grade_items[0].title).toBe("Midterm");
  expect(app.db.grade_items[0].due_on).toBe("2026-11-05");
});

test("lists the work in the order it is due", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(
    gradeItemRow({ id: "a", title: "Third", due_on: "2026-12-01" }),
    gradeItemRow({ id: "b", title: "First", due_on: "2026-10-01" }),
    gradeItemRow({ id: "c", title: "Second", due_on: "2026-11-01" }),
    gradeItemRow({ id: "d", title: "No date" }),
  );
  await app.open("/academic");

  await expect(page.getByText("No date")).toBeVisible();
  const rows = await page
    .locator("section[aria-label='Exams'] li")
    .allTextContents();
  expect(rows.map((row) => row.trim().slice(0, 6))).toEqual([
    "FirstO",
    "Second",
    "ThirdD",
    "No dat",
  ]);
});

test("puts the chart beside the work, not under it", async ({ app, page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "m1", title: "One", score: 95 }));
  await app.open("/academic");

  const table = await page.getByRole("region", { name: "Exams" }).boundingBox();
  const chart = await page
    .getByRole("list", { name: "Chance of each grade" })
    .boundingBox();

  expect(chart!.x).toBeGreaterThan(table!.x + table!.width - 10);
});
