"use client";

import { money, round } from "@/modules/finance/lib/month";

const R = 52;
const RING = 2 * Math.PI * R;

function Figure({
  caption,
  value,
  tint,
  ink,
}: {
  caption: string;
  value: number;
  tint?: string;
  ink?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-canvas px-4 py-3 text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
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
        className="mt-0.5 text-2xl font-semibold"
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
  const netInk =
    net > 0 ? "var(--money-in)" : net < 0 ? "var(--money-out)" : "var(--ink)";

  return (
    <div className="grid justify-items-center gap-5 rounded-3xl border border-line-strong bg-surface p-6 shadow-md">
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label={`Income ${money(income)}, expenses ${money(expense)}`}
        className="size-60"
      >
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--line)"
          strokeWidth="16"
        />
        {sum > 0 ? (
          <g transform="rotate(-90 64 64)">
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--event-green-line)"
              strokeWidth="16"
              strokeDasharray={`${share} ${RING - share}`}
            />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--event-red-line)"
              strokeWidth="16"
              strokeDasharray={`${RING - share} ${share}`}
              strokeDashoffset={-share}
            />
          </g>
        ) : null}
        <text
          x="64"
          y="59"
          textAnchor="middle"
          fill="var(--ink-muted)"
          className="text-[9px]"
        >
          Net
        </text>
        <text
          x="64"
          y="74"
          textAnchor="middle"
          fill={netInk}
          fontWeight="600"
          className="text-[13px]"
        >
          {money(net)}
        </text>
      </svg>

      <div className="grid w-full gap-2.5 sm:grid-cols-3">
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
        <Figure caption="Left over" value={net} ink={netInk} />
      </div>
    </div>
  );
}
