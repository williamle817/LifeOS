"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { parseDay, shortDate } from "@/lib/dates";
import {
  ensureEvents,
  ensureFlows,
  eventsServer,
  eventsSnapshot,
  flowsServer,
  flowsSnapshot,
  incomeIn,
  money,
  monthLabel,
  subscribeEvents,
  subscribeFlows,
  thisMonth,
  total,
} from "@/lib/for-dashboard";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/modules/dashboard/lib/today";
import { More, SHOWN } from "@/modules/dashboard/components/panel";

export function MonthIncome() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const flows = useSyncExternalStore(
    subscribeFlows,
    flowsSnapshot,
    flowsServer,
  );
  const events = useSyncExternalStore(
    subscribeEvents,
    eventsSnapshot,
    eventsServer,
  );

  useEffect(() => {
    void ensureFlows();
    void ensureEvents();
  }, []);

  const month = useMemo(() => (day ? thisMonth(parseDay(day)) : null), [day]);
  const rows = useMemo(
    () => (month ? incomeIn(flows, events, month) : []),
    [flows, events, month],
  );

  if (!month) return null;

  return (
    <>
      <div>
        <p className="text-sm font-medium text-ink-muted">
          Income in {monthLabel(month)}
        </p>
        <p
          style={{ color: "var(--money-in)" }}
          className="mt-1 font-display text-5xl font-medium tabular-nums"
        >
          {money(total(rows))}
        </p>
      </div>
      {rows.length ? (
        <ul aria-label="This month's income" className="divide-y divide-line">
          {rows.slice(0, SHOWN).map((one) => (
            <li key={one.flow.id} className="flex items-baseline gap-3 py-2">
              <span className="min-w-0 flex-1 text-sm font-semibold break-words">
                {one.flow.title}
              </span>
              <span className="shrink-0 text-xs text-ink-faint">
                {shortDate(one.on)}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {money(one.flow.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] leading-relaxed text-ink-muted">
          No income recorded this month yet.
        </p>
      )}
      <More count={rows.length - SHOWN} />
    </>
  );
}
