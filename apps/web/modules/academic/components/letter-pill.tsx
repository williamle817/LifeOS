"use client";

import type { Letter } from "@lifeos/contracts";
import { tint } from "@/components/styles";

const TINT: Record<Letter, string> = {
  A: "green",
  B: "blue",
  C: "yellow",
  D: "pink",
  F: "red",
};

export function LetterPill({ letter }: { letter: Letter }) {
  return (
    <span
      style={tint(TINT[letter])}
      className="rounded-full border px-2.5 py-0.5 text-[13px] font-medium"
    >
      {letter}
    </span>
  );
}
