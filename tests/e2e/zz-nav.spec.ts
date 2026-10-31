import {
  categoryRow,
  courseRow,
  gradeItemRow,
  semesterRow,
  test,
} from "./support/fixtures";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("nav position per page", async ({ app, page }) => {
  app.db.semesters.push(semesterRow());
  app.db.courses.push(courseRow());
  app.db.categories.push(categoryRow());
  for (let i = 0; i < 12; i++) {
    app.db.grade_items.push(gradeItemRow({ id: `i${i}`, title: `Item ${i}`, position: i }));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await app.open("/");
  for (const path of ["/", "/schedule", "/academic", "/finance", "/fitness"]) {
    await page.getByRole("link", { name: { "/": "Dashboard", "/schedule": "Schedule", "/academic": "Academic", "/finance": "Finance", "/fitness": "Fitness" }[path]! }).click();
    await page.waitForURL(`**${path}`);
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => {
      const header = document.querySelector("header")!.getBoundingClientRect();
      const links = Array.from(document.querySelectorAll("nav a")).map((a) => Math.round(a.getBoundingClientRect().left * 10) / 10);
      return {
        client: document.documentElement.clientWidth,
        header: Math.round(header.left * 10) / 10,
        links,
      };
    });
    console.log(path, JSON.stringify(info));
  }
});
