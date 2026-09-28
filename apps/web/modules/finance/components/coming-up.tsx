"use client";

import {
  dayLabel,
  daysUntil,
  money,
  whenLabel,
  type Dated,
} from "@/modules/finance/lib/month";

export function ComingUp({
  rows,
  today = new Date(),
}: {
  rows: Dated[];
  today?: Date;
}) {
  if (!rows.length) return null;

  return (
    <div className="rounded-3xl border border-line-strong bg-surface p-4 shadow-md">
      <h3 className="text-sm font-medium">Coming up</h3>

      <ul
        aria-label="Coming up"
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        {rows.map(({ flow, on }) => {
          const soon = daysUntil(on, today) <= 3;
          return (
            <li
              key={`${flow.id}-${on}`}
              className="shrink-0 rounded-2xl bg-surface-muted px-3.5 py-2"
            >
              <span className="block text-[13px]">{flow.title}</span>
              <span className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  style={{ color: "var(--money-out)" }}
                  className="text-[13px] font-medium"
                >
                  {money(flow.amount)}
                </span>
                <span className="text-[11px] text-ink-faint">
                  {dayLabel(on)}
                </span>
                <span
                  style={soon ? { color: "var(--money-out)" } : undefined}
                  className={`text-[11px] ${
                    soon ? "font-medium" : "text-ink-faint"
                  }`}
                >
                  {whenLabel(on, today)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
