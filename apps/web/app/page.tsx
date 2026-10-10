import type { Metadata } from "next";
import Link from "next/link";
import { TodayHeading } from "@/modules/dashboard/components/today-heading";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PANELS = [
  {
    title: "Today",
    body: "Today's events will show here.",
    page: "Schedule",
    href: "/schedule",
  },
  {
    title: "Academic",
    body: "Your courses and grades will show here.",
    page: "Academic",
    href: "/academic",
  },
  {
    title: "Finance",
    body: "This month's income will show here.",
    page: "Finance",
    href: "/finance",
  },
  {
    title: "Fitness",
    body: "Your workouts will show here.",
    page: "Fitness",
    href: "/fitness",
  },
];

export default function DashboardPage() {
  return (
    <div data-page="dashboard" className="mx-auto grid w-full max-w-5xl gap-6">
      <TodayHeading />

      <div className="grid gap-4 sm:grid-cols-2">
        {PANELS.map((panel) => (
          <section
            key={panel.title}
            aria-labelledby={panel.title}
            className="flex min-h-48 flex-col rounded-3xl border border-line bg-surface p-6"
          >
            <h2 id={panel.title} className="text-[15px] font-bold">
              {panel.title}
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">{panel.body}</p>
            <Link
              href={panel.href}
              className="mt-auto self-start rounded-full pt-4 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Open {panel.page}
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
