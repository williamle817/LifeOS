"use client";

import type { Category, Course, GradeItem } from "@lifeos/contracts";
import { daysBetween, dueLabel, isoDay, shortDate } from "@/lib/dates";

function dueOrder(a: GradeItem, b: GradeItem): number {
  const left = a.dueOn ?? "";
  const right = b.dueOn ?? "";
  if (left !== right) return left < right ? -1 : 1;
  return a.title.localeCompare(b.title);
}

export function Upcoming({
  items,
  courses,
  categories,
}: {
  items: GradeItem[];
  courses: Course[];
  categories: Category[];
}) {
  const today = isoDay(new Date());
  const waiting = items
    .filter((item) => item.score === null && item.dueOn)
    .sort(dueOrder);

  const name = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "";
  const courseOf = (id: string) => courses.find((course) => course.id === id);

  return (
    <div>
      <h3 className="font-display text-2xl font-medium">Coming up</h3>
      <p className="mt-1 text-xs text-ink-faint">Every course this semester</p>

      {waiting.length ? (
        <ul aria-label="Coming up" className="mt-4 grid gap-2.5 md:grid-cols-2 lg:grid-cols-1">
          {waiting.map((item) => {
            const days = daysBetween(today, item.dueOn!);
            const soon = days <= 3;
            const [month, day] = shortDate(item.dueOn!).split(" ");
            const course = courseOf(item.courseId);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3.5 rounded-card bg-canvas p-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-faint">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: `var(--event-${course?.color ?? "blue"}-line)`,
                      }}
                    />
                    {[course?.code || course?.title, name(item.categoryId)]
                      .filter(Boolean)
                      .join(" · ")}
                    <span aria-hidden="true">·</span>
                    <span
                      style={soon ? { color: "var(--alert)" } : undefined}
                      className={soon ? "font-bold" : "font-medium"}
                    >
                      {dueLabel(days)}
                    </span>
                  </span>
                </span>
                <span className="order-first flex h-14 w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-surface">
                  <span className="text-[11px] font-semibold text-ink-faint">
                    {month}
                  </span>
                  <span className="font-display text-[1.375rem] leading-none font-semibold">
                    {day}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          Nothing waiting on a score. Give your items a due date and they line
          up here, soonest first.
        </p>
      )}
    </div>
  );
}
