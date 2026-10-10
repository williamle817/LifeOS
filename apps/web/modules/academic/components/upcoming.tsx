"use client";

import type { Category, GradeItem } from "@lifeos/contracts";

const DAY = 24 * 60 * 60 * 1000;

function dateOf(due: string): Date {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateLabel(due: string): string {
  return dateOf(due).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysAway(due: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dateOf(due).getTime() - start.getTime()) / DAY);
}

function whenLabel(due: string, today: Date): string {
  const days = daysAway(due, today);
  if (days < 0) return days === -1 ? "1 day late" : `${-days} days late`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

function dueOrder(a: GradeItem, b: GradeItem): number {
  const left = a.dueOn ?? "";
  const right = b.dueOn ?? "";
  if (left !== right) return left < right ? -1 : 1;
  return a.title.localeCompare(b.title);
}

export function Upcoming({
  items,
  categories,
}: {
  items: GradeItem[];
  categories: Category[];
}) {
  const today = new Date();
  const waiting = items
    .filter((item) => item.score === null && item.dueOn)
    .sort(dueOrder);

  const name = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "";

  return (
    <div>
      <h3 className="text-sm font-medium">Coming up</h3>

      {waiting.length ? (
        <ul aria-label="Coming up" className="mt-3 grid gap-1.5">
          {waiting.map((item) => {
            const soon = daysAway(item.dueOn!, today) <= 3;
            return (
              <li
                key={item.id}
                className="flex items-baseline gap-2 rounded-2xl bg-surface-muted px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-ink-faint">
                    {name(item.categoryId)} · out of {item.maxScore}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-medium">
                    {dateLabel(item.dueOn!)}
                  </span>
                  <span
                    style={soon ? { color: "var(--alert)" } : undefined}
                    className={`text-[11px] ${
                      soon ? "font-medium" : "text-ink-faint"
                    }`}
                  >
                    {whenLabel(item.dueOn!, today)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-ink-muted">
          Nothing waiting on a score. Give your items a due date and they line
          up here, soonest first.
        </p>
      )}
    </div>
  );
}
