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
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:gap-4">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shift(month, -1))}
        className={step}
      >
        <ActionIcon name="back" />
      </button>

      <h2 className="min-w-60 text-center font-display text-4xl font-medium tracking-tight sm:min-w-72 sm:text-[2.75rem]">
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

      {sameMonth(month, now) ? null : (
        <button
          type="button"
          onClick={() => onChange(now)}
          className={primary}
        >
          This month
        </button>
      )}
    </div>
  );
}
