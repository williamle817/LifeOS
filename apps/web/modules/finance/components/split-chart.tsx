"use client";

import { money, round } from "@/modules/finance/lib/month";

const R = 52;
const RING = 2 * Math.PI * R;

function Figure({
  caption,
  value,
  tint,
  ink,
  last = false,
}: {
  caption: string;
  value: number;
  tint?: string;
  ink?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <p
        className={`flex items-center gap-2.5 text-[15px] ${
          tint ? "font-medium text-ink-muted" : "pl-5 font-bold"
        }`}
      >
        {tint ? (
          <span
            aria-hidden="true"
            style={{ backgroundColor: `var(--event-${tint}-line)` }}
            className="size-2.5 rounded-full"
          />
        ) : null}
        {caption}
      </p>
      <p
        style={ink ? { color: ink } : undefined}
        className="font-display text-4xl font-medium tabular-nums"
      >
        {money(value)}
      </p>
    </div>
  );
}

export function SplitChart({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const sum = income + expense;
  const share = sum > 0 ? (income / sum) * RING : 0;
  const net = round(income - expense);
  const spent = income > 0 ? Math.round((expense / income) * 100) : null;
  const netInk =
    net > 0 ? "var(--money-in)" : net < 0 ? "var(--money-out)" : "var(--ink)";

  return (
    <div className="flex flex-wrap items-center gap-x-12 gap-y-6 rounded-panel bg-surface p-6 shadow-soft sm:p-8">
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label={`Income ${money(income)}, expenses ${money(expense)}`}
        className="mx-auto size-56 shrink-0 sm:size-60"
      >
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="12"
        />
        {sum > 0 ? (
          <g transform="rotate(-90 64 64)">
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--event-green-line)"
              strokeWidth="12"
              strokeDasharray={`${share} ${RING - share}`}
            />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--event-red-line)"
              strokeWidth="12"
              strokeDasharray={`${RING - share} ${share}`}
              strokeDashoffset={-share}
            />
          </g>
        ) : null}
        <text
          x="64"
          y="66"
          textAnchor="middle"
          fill="var(--ink)"
          className="font-display text-[26px] font-medium"
        >
          {spent === null ? "--" : `${spent}%`}
        </text>
        <text
          x="64"
          y="81"
          textAnchor="middle"
          fill="var(--ink-muted)"
          className="text-[8.5px]"
        >
          of income spent
        </text>
      </svg>

      <div className="min-w-0 flex-[1_1_22rem]">
        <Figure
          caption="Income"
          value={income}
          tint="green"
          ink="var(--money-in)"
        />
        <Figure
          caption="Expenses"
          value={expense}
          tint="red"
          ink="var(--money-out)"
        />
        <Figure caption="Left over" value={net} ink={netInk} last />
      </div>
    </div>
  );
}
