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
  "rounded-full border border-line p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

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
    <div className="flex flex-wrap items-center gap-2">
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
