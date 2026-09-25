"use client";

import type { Letter } from "@lifeos/contracts";
import type { Chance } from "@/modules/academic/lib/predict";

const TINT: Record<Letter, string> = {
  A: "green",
  B: "blue",
  C: "yellow",
  D: "pink",
  F: "red",
};

export function ChanceChart({ chances }: { chances: Chance[] }) {
  const top = Math.max(...chances.map((c) => c.chance), 1);

  return (
    <div>
      <h3 className="text-xs font-medium text-ink-muted">
        Chance of each grade
      </h3>
      <div
        role="list"
        aria-label="Chance of each grade"
        className="mt-3 flex h-36 items-end gap-3"
      >
        {chances.map((entry) => (
          <div
            key={entry.letter}
            role="listitem"
            aria-label={`${entry.letter} ${entry.chance} percent`}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              style={{ color: `var(--event-${TINT[entry.letter]}-ink)` }}
              className="text-[11px] font-medium"
            >
              {entry.chance}%
            </span>
            <div
              style={{
                height: `${Math.max(2, (entry.chance / top) * 100)}%`,
                backgroundColor: `var(--event-${TINT[entry.letter]})`,
                borderColor: `var(--event-${TINT[entry.letter]}-line)`,
              }}
              className="w-full rounded-t-lg border"
            />
            <span className="text-[13px] font-medium text-ink-muted">
              {entry.letter}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Based on how the marked work has gone so far. It cannot know that the
        final is harder.
      </p>
    </div>
  );
}
