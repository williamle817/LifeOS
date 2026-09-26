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

test("lists what is coming up, soonest first", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow({ id: "exams", name: "Exams" }));
  app.db.grade_items.push(
    gradeItemRow({ id: "c", title: "Third", due_on: "2099-12-01" }),
    gradeItemRow({ id: "a", title: "First", due_on: "2099-10-01" }),
    gradeItemRow({ id: "b", title: "Second", due_on: "2099-11-01" }),
  );
  await app.open("/academic");

  const list = page.getByRole("list", { name: "Coming up" });
  await expect(list).toBeVisible();
  const rows = await list.getByRole("listitem").allTextContents();
  expect(rows[0].startsWith("First")).toBe(true);
  expect(rows[1].startsWith("Second")).toBe(true);
  expect(rows[2].startsWith("Third")).toBe(true);
});

test("leaves marked work out of what is coming up", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow({ id: "exams", name: "Exams" }));
  app.db.grade_items.push(
    gradeItemRow({ id: "a", title: "Done already", score: 88, due_on: "2099-10-01" }),
    gradeItemRow({ id: "b", title: "Still waiting", due_on: "2099-11-01" }),
  );
  await app.open("/academic");

  const list = page.getByRole("list", { name: "Coming up" });
  await expect(list.getByText("Still waiting")).toBeVisible();
  await expect(list.getByText("Done already")).toHaveCount(0);
});

test("flags work whose date has already gone by", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow({ id: "exams", name: "Exams" }));
  app.db.grade_items.push(
    gradeItemRow({ id: "a", title: "Overdue one", due_on: "2020-10-01" }),
  );
  await app.open("/academic");

  await expect(page.getByText(/days late/)).toBeVisible();
});

test("puts the list beside the work, not under it", async ({ app, page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow({ id: "m1", title: "One", score: 95 }));
  await app.open("/academic");

  const table = await page.getByRole("region", { name: "Exams" }).boundingBox();
  const panel = await page.getByText("Coming up").boundingBox();

  expect(panel!.x).toBeGreaterThan(table!.x + table!.width - 10);
});
