import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons";
import { primary } from "@/components/styles";
import { TodayHeading } from "@/modules/dashboard/components/today-heading";
import "./dashboard.css";
import "./schedule/schedule.css";
import "./academic/academic.css";
import "./finance/finance.css";
import "./fitness/fitness.css";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PANELS = [
  {
    title: "Today",
    body: "Today's events will show here.",
    page: "Schedule",
    href: "/schedule",
    tone: "schedule",
  },
  {
    title: "Academic",
    body: "Your courses and grades will show here.",
    page: "Academic",
    href: "/academic",
    tone: "academic",
  },
  {
    title: "Finance",
    body: "This month's income will show here.",
    page: "Finance",
    href: "/finance",
    tone: "finance",
  },
  {
    title: "Fitness",
    body: "Your workouts will show here.",
    page: "Fitness",
    href: "/fitness",
    tone: "fitness",
  },
] as const;

export default function DashboardPage() {
  return (
    <div data-page="dashboard" className="mx-auto grid w-full max-w-6xl gap-10">
      <TodayHeading />

      <div className="grid gap-5 sm:grid-cols-2">
        {PANELS.map((panel) => (
          <section
            key={panel.title}
            data-tone={panel.tone}
            aria-labelledby={panel.title}
            className="flex min-h-60 flex-col gap-4 rounded-panel bg-surface p-7 text-ink shadow-soft"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-[22px]">
                <NavIcon name={panel.tone} />
              </span>
              <h2
                id={panel.title}
                className="font-display text-[1.75rem] leading-tight font-medium"
              >
                {panel.title}
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-muted">
              {panel.body}
            </p>
            <Link
              href={panel.href}
              className={`${primary} mt-auto min-h-11 self-start`}
            >
              Open {panel.page}
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
