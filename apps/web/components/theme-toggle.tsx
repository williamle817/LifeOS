"use client";

import { useSyncExternalStore } from "react";
import { ActionIcon } from "@/components/icons";
import {
  getServerSnapshot,
  getSnapshot,
  setMode,
  subscribe,
} from "@/lib/theme";

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next = mode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => setMode(next)}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-ink transition-colors hover:brightness-95"
    >
      <ActionIcon name={mode === "dark" ? "moon" : "sun"} />
    </button>
  );
}
