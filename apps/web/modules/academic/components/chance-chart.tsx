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
  const best = chances.reduce((a, b) => (b.chance > a.chance ? b : a));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Chance of each grade</h3>
        <span
          style={{
            backgroundColor: `var(--event-${TINT[best.letter]})`,
            color: `var(--event-${TINT[best.letter]}-ink)`,
          }}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        >
          most likely {best.letter}
        </span>
      </div>

      <div
        role="list"
        aria-label="Chance of each grade"
        className="mt-4 flex h-44 gap-2"
      >
        {chances.map((entry) => (
          <div
            key={entry.letter}
            role="listitem"
            aria-label={`${entry.letter} ${entry.chance} percent`}
            className="flex h-full flex-1 flex-col items-center gap-2"
          >
            <span
              className={`text-[11px] ${
                entry.chance > 0 ? "font-medium text-ink" : "text-ink-faint"
              }`}
            >
              {entry.chance}%
            </span>

            <div className="flex w-full flex-1 items-end overflow-hidden rounded-xl bg-surface-muted">
              <div
                style={{
                  height: `${(entry.chance / top) * 100}%`,
                  backgroundColor: `var(--event-${TINT[entry.letter]}-line)`,
                }}
                className="w-full rounded-xl"
              />
            </div>

            <span
              style={{
                backgroundColor: `var(--event-${TINT[entry.letter]})`,
                color: `var(--event-${TINT[entry.letter]}-ink)`,
              }}
              className="w-7 rounded-full py-0.5 text-center text-[13px] font-medium"
            >
              {entry.letter}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Worked out by running the rest of your term ten thousand times, using how
        each part has gone so far. It cannot know that the final is harder.
      </p>
    </div>
  );
}
