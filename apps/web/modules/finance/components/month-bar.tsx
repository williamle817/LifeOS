"use client";

import { ActionIcon } from "@/components/icons";
import { primary } from "@/components/styles";
import {
  monthLabel,
  sameMonth,
  shift,
  thisMonth,
  type Month,
} from "@/modules/finance/lib/month";

const step =
  "grid size-11 place-items-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-muted";

export function MonthBar({
  month,
  onChange,
  today = new Date(),
}: {
  month: Month;
  onChange: (month: Month) => void;
  today?: Date;
}) {
  const now = thisMonth(today);

  return (
    <div className="grid items-center gap-3 pt-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
      <div className="flex items-center justify-between gap-2 sm:col-start-2 sm:gap-4">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onChange(shift(month, -1))}
          className={step}
        >
          <ActionIcon name="back" />
        </button>

        <h2 className="min-w-0 flex-1 text-center font-display text-[1.75rem] font-medium tracking-tight sm:min-w-72 sm:flex-none sm:text-[2.75rem]">
          {monthLabel(month)}
        </h2>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => onChange(shift(month, 1))}
          className={step}
        >
          <ActionIcon name="forward" />
        </button>
      </div>

      {sameMonth(month, now) ? null : (
        <button
          type="button"
          onClick={() => onChange(now)}
          className={`${primary} justify-self-center sm:justify-self-start`}
        >
          This month
        </button>
      )}
    </div>
  );
}
