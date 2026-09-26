import {
  at,
  categoryRow,
  courseRow,
  dayOf,
  expect,
  monday,
  semesterRow,
  test,
} from "../support/fixtures";

function examEvent(start: Date): Record<string, unknown> {
  return {
    id: "ev-1",
    user_id: "u1",
    type: "exam",
    title: "Exam 2",
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
  };
}

function examItem(start: Date): Record<string, unknown> {
  return {
    id: "i1",
    user_id: "u1",
    course_id: "c1",
    category_id: "exams",
    title: "Exam 2",
    score: null,
    max_score: 50,
    due_on: dayOf(start),
    event_id: "ev-1",
  };
}

test("delete on the calendar, then walk to Academic without reloading", async ({
  app,
  page,
}) => {
  const start = monday();
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.events.push(examEvent(start));
  app.db.grade_items.push(examItem(start));

  await app.open("/schedule");
  await page.waitForSelector(".fc-view-harness");

  await page.getByText("Exam 2").first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Exam 2")).toHaveCount(0);

  await page.getByRole("link", { name: "Academic" }).click();
  await page.waitForURL("**/academic");

  await expect(page.getByText("Exam 2")).toHaveCount(0);
});

test("Academic in a second tab catches up when you switch back to it", async ({
  app,
  page,
  context,
}) => {
  const start = monday();
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  app.db.events.push(examEvent(start));
  app.db.grade_items.push(examItem(start));

  await app.open("/schedule");
  await page.waitForSelector(".fc-view-harness");

  const second = await context.newPage();
  await second.goto("http://localhost:3100/academic");
  await expect(second.getByText("Exam 2")).toBeVisible();

  await page.getByText("Exam 2").first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect.poll(() => app.db.grade_items.length).toBe(0);

  await second.bringToFront();
  await second.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(second.getByText("Exam 2")).toHaveCount(0);
});
