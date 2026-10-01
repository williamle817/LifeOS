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
      className="shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
    >
      <ActionIcon name={mode === "dark" ? "moon" : "sun"} />
    </button>
  );
}
