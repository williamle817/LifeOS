import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Dashboard",
};

const SECTIONS = [
  {
    title: "Today",
    body: "Your events for today, once Schedule has something in it.",
  },
  {
    title: "This month",
    body: "Income, estimated tax and spending, derived from your work and dining events.",
  },
  {
    title: "Academic",
    body: "Current grade and how much of each course has been graded.",
  },
  {
    title: "Fitness",
    body: "Recent sessions, workout frequency and calories burned.",
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="One place to see the state of your day and week. Each section fills in as you start using the module behind it."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="text-sm font-medium">{section.title}</h2>
            <p className="mt-1.5 text-sm text-ink-muted">{section.body}</p>
            <p className="mt-4 text-xs text-ink-faint">Nothing to show yet.</p>
          </section>
        ))}
      </div>
    </>
  );
}
