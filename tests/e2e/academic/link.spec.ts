import {
  at,
  categoryRow,
  courseRow,
  dayOf,
  dragSlots,
  expect,
  monday,
  semesterRow,
  test,
} from "../support/fixtures";

function today(): string {
  return dayOf(new Date());
}

function withCourse(db: {
  semesters: Record<string, unknown>[];
  courses: Record<string, unknown>[];
  categories: Record<string, unknown>[];
}) {
  db.semesters.push(semesterRow());
  db.courses.push(courseRow());
  db.categories.push(categoryRow());
}

test("a class event can pick a course that already exists", async ({
  calendar,
  page,
}) => {
  withCourse(calendar.db);
  await calendar.open();

  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await page.getByLabel("Type").selectOption("class");

  await expect(page.getByLabel("Course", { exact: true })).toBeVisible();
  await page.getByLabel("Title").fill("Lecture");
  await page.getByLabel("Course", { exact: true }).selectOption("c1");
  await page.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => calendar.db.events.length).toBe(1);
  expect(calendar.db.events[0].data).toMatchObject({
    course: "CS 201",
    courseId: "c1",
  });
});

test("a class event can still be typed in by hand", async ({
  calendar,
  page,
}) => {
  withCourse(calendar.db);
  await calendar.open();

  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await page.getByLabel("Type").selectOption("class");
  await page.getByLabel("Course", { exact: true }).selectOption("custom");
  await page.getByLabel("Title").fill("Lecture");
  await page.getByLabel("Course name").fill("Guest seminar");
  await page.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => calendar.db.events.length).toBe(1);
  expect(calendar.db.events[0].data).toMatchObject({
    course: "Guest seminar",
  });
});

test("an exam never offers a repeat", async ({ calendar, page }) => {
  withCourse(calendar.db);
  await calendar.open();

  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await expect(page.getByLabel("Repeat")).toBeVisible();

  await page.getByLabel("Type").selectOption("exam");
  await expect(page.getByLabel("Repeat")).toHaveCount(0);
});

test("saving an exam creates the grade item, waiting for a score", async ({
  calendar,
  page,
}) => {
  withCourse(calendar.db);
  await calendar.open();

  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await page.getByLabel("Type").selectOption("exam");
  await page.getByLabel("Title").fill("Midterm");
  await page.getByLabel("Course", { exact: true }).selectOption("c1");
  await page.getByLabel("Counts toward").selectOption("exams");
  await page.getByLabel("Max score").fill("50");
  await page.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => calendar.db.grade_items.length).toBe(1);
  expect(calendar.db.grade_items[0]).toMatchObject({
    title: "Midterm",
    course_id: "c1",
    category_id: "exams",
    max_score: 50,
    score: null,
    due_on: today(),
  });
});

test("the exam shows up in Academic and takes a score there", async ({
  app,
  page,
}) => {
  withCourse(app.db);
  await app.open("/schedule");
  await page.waitForSelector(".fc-view-harness");

  await dragSlots(page, today(), "10:00:00", "11:00:00");
  await page.getByLabel("Type").selectOption("exam");
  await page.getByLabel("Title").fill("Midterm");
  await page.getByLabel("Course", { exact: true }).selectOption("c1");
  await page.getByLabel("Counts toward").selectOption("exams");
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => app.db.grade_items.length).toBe(1);

  await app.open("/academic");
  await expect(page.getByText("Midterm")).toBeVisible();
  await expect(page.getByText("from Schedule")).toBeVisible();

  await page.getByLabel("Midterm score").fill("88");
  await expect(page.getByText("88%").first()).toBeVisible();
  await expect.poll(() => app.db.grade_items[0].score).toBe(88);
});

test("deleting the exam takes its grade item with it", async ({
  calendar,
  page,
}) => {
  const start = monday();
  withCourse(calendar.db);
  calendar.db.events.push({
    id: "ev-1",
    user_id: "u1",
    type: "exam",
    title: "Midterm",
    start_at: at(start, 9),
    end_at: at(start, 10),
    all_day: false,
    color: null,
    notes: null,
    series_id: null,
    recurrence: null,
    occurrence_date: null,
    cancelled: false,
    data: { course: "CS 201", courseId: "c1", categoryId: "exams", maxScore: 50 },
  });
  calendar.db.grade_items.push({
    id: "i1",
    user_id: "u1",
    course_id: "c1",
    category_id: "exams",
    title: "Midterm",
    score: null,
    max_score: 50,
    due_on: dayOf(start),
    event_id: "ev-1",
  });
  await calendar.open();

  await page.getByText("Midterm").first().click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect.poll(() => calendar.db.grade_items.length).toBe(0);
  await expect.poll(() => calendar.db.events.length).toBe(0);
});
