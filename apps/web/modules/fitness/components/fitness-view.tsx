"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/empty-state";
import { primary, quiet } from "@/components/styles";
import { parseDay, shiftDay, shortDate } from "@/lib/dates";
import {
  ensureEvents,
  eventsServer,
  eventsSnapshot,
  hoursOf,
  mondayOf,
  onDay,
  subscribeEvents,
  weekTotals,
  workoutsIn,
} from "@/lib/for-fitness";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/today";

const TRACKED = ["Workout type", "Duration", "Calories burned"];

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function FitnessView() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const events = useSyncExternalStore(
    subscribeEvents,
    eventsSnapshot,
    eventsServer,
  );

  useEffect(() => {
    void ensureEvents();
  }, []);

  const monday = day ? mondayOf(day) : "";
  const workouts = useMemo(
    () => (monday ? workoutsIn(events, monday) : []),
    [events, monday],
  );
  const totals = weekTotals(workouts);

  if (!day) return <div data-page="fitness" />;

  if (!workouts.length) {
    return (
      <div data-page="fitness" className="mx-auto w-full max-w-6xl">
        <EmptyState
          icon="fitness"
          title="No workouts this week"
          body="Add a gym event in Schedule and it shows up here: what you did, for how long, and the calories burned."
        >
          <ul
            aria-label="What this page tracks"
            className="flex flex-wrap justify-center gap-2"
          >
            {TRACKED.map((one) => (
              <li
                key={one}
                className="rounded-full bg-surface-muted px-3.5 py-2 text-[13px] font-semibold text-ink-muted"
              >
                {one}
              </li>
            ))}
          </ul>
          <Link
            href="/schedule"
            className={`${primary} mt-2 min-h-12 px-6 text-[15px]`}
          >
            Log a workout in Schedule
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div data-page="fitness" className="mx-auto grid w-full max-w-6xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-base font-medium text-ink-muted">
            {shortDate(monday)} to {shortDate(shiftDay(monday, 6))}
          </p>
          <h1 className="mt-1 font-display text-5xl font-medium tracking-tight">
            This week
          </h1>
        </div>
        <Link href="/schedule" className={quiet}>
          Log a workout in Schedule
        </Link>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel bg-surface p-6 shadow-soft">
          <dt className="text-[13px] font-medium text-ink-muted">Sessions</dt>
          <dd className="mt-1 font-display text-5xl font-medium tabular-nums">
            {totals.sessions}
          </dd>
        </div>
        <div className="rounded-panel bg-surface p-6 shadow-soft">
          <dt className="text-[13px] font-medium text-ink-muted">Time</dt>
          <dd className="mt-1 font-display text-5xl font-medium tabular-nums">
            {duration(totals.minutes)}
          </dd>
        </div>
        <div className="rounded-panel bg-surface p-6 shadow-soft">
          <dt className="text-[13px] font-medium text-ink-muted">Calories</dt>
          <dd className="mt-1 font-display text-5xl font-medium tabular-nums">
            {totals.calories.toLocaleString("en-US")}
          </dd>
        </div>
      </dl>

      <section
        aria-label="Workouts this week"
        className="overflow-hidden rounded-panel bg-surface shadow-soft"
      >
        <ul className="divide-y divide-surface-muted">
          {workouts.map((one) => (
            <li key={one.id} className="flex items-center gap-4 px-6 py-4">
              <span className="w-12 shrink-0 text-sm font-semibold text-ink-muted">
                {parseDay(onDay(one)).toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold break-words">
                  {one.title}
                </span>
                {one.workout && one.workout !== one.title ? (
                  <span className="text-xs text-ink-faint">{one.workout}</span>
                ) : null}
              </span>
              {one.calories ? (
                <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                  {one.calories.toLocaleString("en-US")} cal
                </span>
              ) : null}
              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                {one.allDay ? "All day" : duration(Math.round(hoursOf(one) * 60))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
