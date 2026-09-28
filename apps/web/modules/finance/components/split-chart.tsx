"use client";

import { money, round } from "@/modules/finance/lib/month";

const R = 52;
const RING = 2 * Math.PI * R;

function Figure({
  caption,
  value,
  tint,
}: {
  caption: string;
  value: number;
  tint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
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
        style={tint ? { color: `var(--event-${tint}-ink)` } : undefined}
        className="mt-0.5 text-xl font-semibold"
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

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-line-strong bg-surface p-5 shadow-md">
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label={`Income ${money(income)}, expenses ${money(expense)}`}
        className="size-36 shrink-0"
      >
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--surface-muted)"
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
          y="60"
          textAnchor="middle"
          fill="var(--ink-muted)"
          className="text-[11px]"
        >
          Net
        </text>
        <text
          x="64"
          y="78"
          textAnchor="middle"
          fill="var(--ink)"
          fontWeight="600"
          className="text-[15px]"
        >
          {money(net)}
        </text>
      </svg>

      <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
        <Figure caption="Income" value={income} tint="green" />
        <Figure caption="Expenses" value={expense} tint="red" />
        <Figure caption="Left over" value={net} />
      </div>
    </div>
  );
}
