"use client";

import { ActionIcon } from "@/components/icons";
import {
  monthLabel,
  sameMonth,
  shift,
  thisMonth,
  type Month,
} from "@/modules/finance/lib/month";

const step =
  "rounded-full border border-line-strong bg-surface p-1.5 text-ink shadow-sm transition-colors hover:bg-surface-muted";

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
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-line-strong bg-surface px-2 py-2 shadow-sm md:w-fit">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shift(month, -1))}
        className={step}
      >
        <ActionIcon name="back" />
      </button>

      <h2 className="min-w-44 text-center text-sm font-medium">
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
          className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
        >
          This month
        </button>
      )}
    </div>
  );
}
