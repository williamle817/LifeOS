"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { daysBetween, parseDay, shortDate } from "@/lib/dates";
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
  upcomingCharges,
  whenLabel,
} from "@/lib/for-dashboard";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/today";

const CHARGES = 3;

export function FinanceSummary() {
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
  const income = useMemo(
    () => (month ? total(incomeIn(flows, events, month)) : 0),
    [flows, events, month],
  );
  const charges = useMemo(
    () => (day ? upcomingCharges(flows, events, day).slice(0, CHARGES) : []),
    [flows, events, day],
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
          {money(income)}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Coming up</h3>
        {charges.length ? (
          <ul aria-label="Charges coming up" className="mt-2 grid gap-2">
            {charges.map(({ flow, on }) => {
              const soon = daysBetween(day, on) <= 3;
              const [name, date] = shortDate(on).split(" ");
              return (
                <li
                  key={`${flow.id}-${on}`}
                  className="flex items-center gap-3 rounded-card bg-canvas p-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-words">
                      {flow.title}
                    </span>
                    <span
                      style={{ color: "var(--money-out)" }}
                      className="text-xs font-semibold tabular-nums"
                    >
                      {money(flow.amount)}
                    </span>
                  </span>
                  <span className="order-first flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                    <span className="text-[11px] font-semibold text-ink-faint">
                      {name}
                    </span>
                    <span className="font-display text-lg leading-none font-semibold">
                      {date}
                    </span>
                  </span>
                  <span
                    style={soon ? { color: "var(--alert)" } : undefined}
                    className={`shrink-0 pr-1 text-xs ${
                      soon ? "font-bold" : "font-medium text-ink-faint"
                    }`}
                  >
                    {whenLabel(on, parseDay(day))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
            No charges coming up.
          </p>
        )}
      </div>
    </>
  );
}
