import {
  categoryRow,
  courseRow,
  expect,
  gradeItemRow,
  semesterRow,
  test,
} from "../support/fixtures";

test("asks for a semester before anything else", async ({ app, page }) => {
  await app.open("/academic");
  await expect(page.getByText(/Add a semester to start/)).toBeVisible();
});

test("creates a semester and then a course", async ({ app, page }) => {
  await app.open("/academic");

  await page.getByRole("button", { name: "New semester" }).click();
  await page.getByLabel("Semester name").fill("Fall 2026");
  await page.getByRole("button", { name: "Add semester" }).click();

  await expect(page.getByText(/No courses in this semester yet/)).toBeVisible();
  expect(app.db.semesters).toHaveLength(1);

  await page.getByRole("button", { name: "New course" }).click();
  await page.getByLabel("Course name").fill("Data Structures");
  await page.getByLabel("Code").fill("CS 201");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("button", { name: /CS 201/ })).toBeVisible();
  await expect.poll(() => app.db.courses.length).toBe(1);
  await expect.poll(() => app.db.categories.length).toBe(3);
});

test("will not save a course whose weights do not add up", async ({
  app,
  page,
}) => {
  app.db.semesters.push(semesterRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "New course" }).click();
  await page.getByLabel("Course name").fill("Physics");
  await page.getByLabel("Category 1 weight").fill("10");

  await expect(page.getByText(/have to add up to 100/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(app.db.courses).toHaveLength(0);

  await page.getByLabel("Category 1 weight").fill("40");
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("counts extra credit on top of the hundred", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "New course" }).click();
  await page.getByLabel("Course name").fill("Physics");
  await page.getByLabel("Category 3 extra credit").check();
  await page.getByLabel("Category 1 weight").fill("70");

  await expect(page.getByText(/100 of 100 plus 30 extra credit/)).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect
    .poll(() => app.db.categories.filter((c) => c.extra_credit).length)
    .toBe(1);
});

test("edits a course and its categories", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Course name").fill("Algorithms");
  await page.getByLabel("Category 1 drop lowest").fill("2");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/Algorithms/)).toBeVisible();
  await expect.poll(() => app.db.courses[0].title).toBe("Algorithms");
  await expect.poll(() => app.db.categories[0].drop_lowest).toBe(2);
});

test("deletes a course", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Delete course" }).click();

  await expect(page.getByText(/No courses in this semester yet/)).toBeVisible();
  expect(app.db.courses).toHaveLength(0);
});

test("keeps each semester's courses apart", async ({ app, page }) => {
  app.db.semesters.push(
    semesterRow(),
    semesterRow({ id: "sem-2", name: "Spring 2027", starts_on: "2099-01-10" }),
  );
  app.db.courses.push(
    courseRow(),
    courseRow({ id: "c2", code: "PHYS 101", semester_id: "sem-2" }),
  );
  app.db.categories.push(categoryRow());
  await app.open("/academic");

  await expect(page.getByRole("button", { name: /CS 201/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /PHYS 101/ })).toHaveCount(0);

  await page.getByLabel("Semester").selectOption("sem-2");

  await expect(page.getByRole("button", { name: /PHYS 101/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /CS 201/ })).toHaveCount(0);
});

test("stays on the same page while switching course", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow(), courseRow({ id: "c2", code: "MATH 241" }));
  app.db.categories.push(categoryRow(), categoryRow({ id: "c2exams", course_id: "c2" }));
  await app.open("/academic");

  const before = page.url();
  await page.getByRole("button", { name: /MATH 241/ }).click();

  await expect(
    page.getByRole("button", { name: /MATH 241/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toBe(before);
});

test("remembers the course after a reload", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow(), courseRow({ id: "c2", code: "MATH 241" }));
  app.db.categories.push(categoryRow(), categoryRow({ id: "c2exams", course_id: "c2" }));
  await app.open("/academic");

  await page.getByRole("button", { name: /MATH 241/ }).click();
  await page.reload();

  await expect(
    page.getByRole("button", { name: /MATH 241/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("deletes a semester and everything under it", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.grade_items.push(gradeItemRow());
  await app.open("/academic");

  await page.getByRole("button", { name: "Delete semester" }).click();

  await expect(page.getByText(/Add a semester to start/)).toBeVisible();
  expect(app.db.semesters).toHaveLength(0);
});
