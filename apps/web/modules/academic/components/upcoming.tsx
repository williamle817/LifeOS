"use client";

import type { Category, GradeItem } from "@lifeos/contracts";
import { daysBetween, isoDay, shortDate } from "@/lib/dates";

function whenLabel(days: number): string {
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
  const today = isoDay(new Date());
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
            const days = daysBetween(today, item.dueOn!);
            const soon = days <= 3;
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
                    {shortDate(item.dueOn!)}
                  </span>
                  <span
                    style={soon ? { color: "var(--alert)" } : undefined}
                    className={`text-[11px] ${
                      soon ? "font-medium" : "text-ink-faint"
                    }`}
                  >
                    {whenLabel(days)}
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
