"use client";

import { useRef } from "react";
import type { FlowKind } from "@lifeos/contracts";

const SIDES: { kind: FlowKind; label: string }[] = [
  { kind: "expense", label: "Expenses" },
  { kind: "income", label: "Income" },
];

export function SideSwitch({
  side,
  counts,
  onChange,
}: {
  side: FlowKind;
  counts: Record<FlowKind, number>;
  onChange: (side: FlowKind) => void;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(from: number) {
    const next = (from + 1) % SIDES.length;
    onChange(SIDES[next].kind);
    tabs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Entries"
      className="flex rounded-full bg-canvas p-1"
    >
      {SIDES.map(({ kind, label }, index) => {
        const selected = kind === side;
        return (
          <button
            key={kind}
            ref={(el) => {
              tabs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                move(index);
              }
            }}
            className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
              selected
                ? "bg-surface font-semibold text-ink shadow-float"
                : "font-medium text-ink-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden="true"
              style={{
                backgroundColor: `var(--event-${kind === "income" ? "green" : "red"}-line)`,
              }}
              className="size-2 rounded-full"
            />
            {label}
            <span className="text-xs tabular-nums text-ink-faint">
              {counts[kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
