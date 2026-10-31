"use client";

import { daysBetween, isoDay, shortDate } from "@/lib/dates";
import { money, whenLabel, type Dated } from "@/modules/finance/lib/month";

export function ComingUp({
  rows,
  today = new Date(),
}: {
  rows: Dated[];
  today?: Date;
}) {
  if (!rows.length) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <h3 className="font-display text-[1.75rem] font-medium">Coming up</h3>

      <ul aria-label="Coming up" className="flex flex-wrap gap-3">
        {rows.map(({ flow, on }) => {
          const soon = daysBetween(isoDay(today), on) <= 3;
          const [month, day] = shortDate(on).split(" ");
          return (
            <li
              key={`${flow.id}-${on}`}
              className="flex min-w-0 flex-[1_1_16rem] items-center gap-3.5 rounded-card bg-surface p-3 shadow-soft"
            >
              <span className="flex h-14 w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-muted">
                <span className="text-[11px] font-semibold text-ink-faint">
                  {month}
                </span>{" "}
                <span className="font-display text-[1.375rem] leading-none font-semibold">
                  {day}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {flow.title}
                </span>{" "}
                <span
                  style={{ color: "var(--money-out)" }}
                  className="text-[13px] font-semibold tabular-nums"
                >
                  {money(flow.amount)}
                </span>
              </span>{" "}
              <span
                style={soon ? { color: "var(--alert)" } : undefined}
                className={`shrink-0 text-xs ${
                  soon ? "font-bold" : "font-medium text-ink-faint"
                }`}
              >
                {whenLabel(on, today)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
