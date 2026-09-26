"use client";

import type { Letter } from "@lifeos/contracts";

const TINT: Record<Letter, string> = {
  A: "green",
  B: "blue",
  C: "yellow",
  D: "pink",
  F: "red",
};

export function LetterPill({
  letter,
  size = "base",
}: {
  letter: Letter;
  size?: "base" | "small";
}) {
  return (
    <span
      style={{
        backgroundColor: `var(--event-${TINT[letter]})`,
        borderColor: `var(--event-${TINT[letter]}-line)`,
        color: `var(--event-${TINT[letter]}-ink)`,
      }}
      className={`rounded-full border font-medium ${
        size === "small"
          ? "px-2 py-0.5 text-[11px]"
          : "px-2.5 py-0.5 text-[13px]"
      }`}
    >
      {letter}
    </span>
  );
}
