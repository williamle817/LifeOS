"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { daysBetween, parseDay } from "@/lib/dates";
import {
  academicServer,
  academicSnapshot,
  deadlines,
  ensureAcademic,
  ensureEvents,
  ensureFlows,
  eventsOn,
  eventsServer,
  eventsSnapshot,
  flowsServer,
  flowsSnapshot,
  subscribeAcademic,
  subscribeEvents,
  subscribeFlows,
  upcomingCharges,
  whenLabel,
} from "@/lib/for-dashboard";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/today";

const chip =
  "inline-flex min-h-9 items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-ink shadow-float transition-colors hover:bg-surface-muted";

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function TodaySummary() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const events = useSyncExternalStore(
    subscribeEvents,
    eventsSnapshot,
    eventsServer,
  );
  const academic = useSyncExternalStore(
    subscribeAcademic,
    academicSnapshot,
    academicServer,
  );
  const flows = useSyncExternalStore(
    subscribeFlows,
    flowsSnapshot,
    flowsServer,
  );

  useEffect(() => {
    void ensureEvents();
    void ensureAcademic();
    void ensureFlows();
  }, []);

  const summary = useMemo(() => {
    if (!day) return null;
    const today = eventsOn(events, day).length;
    const due = deadlines(academic, day);
    const late = due.filter((one) => one.days < 0).length;
    const soon = due.filter((one) => one.days >= 0 && one.days <= 3).length;
    const charge = upcomingCharges(flows, events, day).find(
      (one) => daysBetween(day, one.on) <= 7,
    );
    return { today, late, soon, charge };
  }, [day, events, academic, flows]);

  if (!summary || !day) return null;

  return (
    <ul aria-label="Today at a glance" className="mt-5 flex flex-wrap gap-2">
      <li>
        <Link href="/schedule" className={chip}>
          {summary.today
            ? `${count(summary.today, "event", "events")} today`
            : "Nothing on the calendar today"}
        </Link>
      </li>
      {summary.late ? (
        <li>
          <Link
            href="/academic"
            style={{ color: "var(--alert)" }}
            className={chip}
          >
            {count(summary.late, "assignment", "assignments")} late
          </Link>
        </li>
      ) : summary.soon ? (
        <li>
          <Link href="/academic" className={chip}>
            {count(summary.soon, "assignment", "assignments")} due in 3 days
          </Link>
        </li>
      ) : null}
      {summary.charge ? (
        <li>
          <Link href="/finance" className={chip}>
            {summary.charge.flow.title}{" "}
            {whenLabel(summary.charge.on, parseDay(day))}
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
