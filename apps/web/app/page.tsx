import type { Metadata } from "next";
import { Panel } from "@/modules/dashboard/components/panel";
import { TodayHeading } from "@/modules/dashboard/components/today-heading";
import { TodaySummary } from "@/modules/dashboard/components/today-summary";
import { TodayEvents } from "@/modules/dashboard/components/today-events";
import { Deadlines } from "@/modules/dashboard/components/deadlines";
import { FinanceSummary } from "@/modules/dashboard/components/finance-summary";
import "./dashboard.css";
import "./schedule/schedule.css";
import "./academic/academic.css";
import "./finance/finance.css";
import "./fitness/fitness.css";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div data-page="dashboard" className="mx-auto grid w-full max-w-6xl gap-10">
      <div>
        <TodayHeading />
        <TodaySummary />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Panel tone="schedule" title="Today" page="Schedule" href="/schedule">
          <TodayEvents />
        </Panel>
        <Panel tone="academic" title="Academic" page="Academic" href="/academic">
          <Deadlines />
        </Panel>
        <Panel tone="finance" title="Finance" page="Finance" href="/finance">
          <FinanceSummary />
        </Panel>
        <Panel tone="fitness" title="Fitness" page="Fitness" href="/fitness">
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Your workouts will show here.
          </p>
        </Panel>
      </div>
    </div>
  );
}
