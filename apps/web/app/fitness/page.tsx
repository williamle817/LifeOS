import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { primary } from "@/components/styles";
import "./fitness.css";

export const metadata: Metadata = {
  title: "Fitness",
};

const TRACKED = ["Workout type", "Duration", "Calories burned"];

export default function FitnessPage() {
  return (
    <div data-page="fitness" className="mx-auto w-full max-w-6xl">
      <EmptyState
        icon="fitness"
        title="No sessions yet"
        body="Workout type, duration and calories burned show up here, with weekly and monthly summaries."
        hint="Coming after the backend is in place."
      >
        <ul
          aria-label="What this page will track"
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
