"use client";

import { useSyncExternalStore } from "react";
import { parseDay } from "@/lib/dates";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/modules/dashboard/lib/today";

export function TodayHeading() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const date = day ? parseDay(day) : null;

  return (
    <header className="min-h-24 px-1 pt-2 sm:min-h-32">
      {date ? (
        <>
          <p className="text-base font-medium text-ink-muted">
            {date.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <h1 className="mt-1 font-display text-6xl leading-[0.98] font-medium tracking-tight sm:text-8xl">
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </h1>
        </>
      ) : null}
    </header>
  );
}
