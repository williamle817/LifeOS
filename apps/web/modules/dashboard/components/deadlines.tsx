"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { dueLabel, shortDate } from "@/lib/dates";
import {
  academicServer,
  academicSnapshot,
  deadlines,
  ensureAcademic,
  subscribeAcademic,
} from "@/lib/for-dashboard";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/today";
import { More, SHOWN } from "@/modules/dashboard/components/panel";

export function Deadlines() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const academic = useSyncExternalStore(
    subscribeAcademic,
    academicSnapshot,
    academicServer,
  );

  useEffect(() => {
    void ensureAcademic();
  }, []);

  const due = useMemo(
    () => (day ? deadlines(academic, day) : []),
    [academic, day],
  );

  if (!day) return null;
  if (!due.length) {
    return (
      <p className="text-[15px] leading-relaxed text-ink-muted">
        Nothing due. Work with a due date and no score yet shows up here.
      </p>
    );
  }

  return (
    <>
      <ul aria-label="Due and late work" className="grid gap-2">
        {due.slice(0, SHOWN).map(({ item, course, due: on, days }) => {
          const [month, date] = shortDate(on).split(" ");
          const soon = days <= 3;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-card bg-canvas p-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold break-words">
                  {item.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: `var(--event-${course.color ?? "blue"}-line)`,
                    }}
                  />
                  {course.code || course.title}
                </span>
              </span>
              <span className="order-first flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                <span className="text-[11px] font-semibold text-ink-faint">
                  {month}
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
                {dueLabel(days)}
              </span>
            </li>
          );
        })}
      </ul>
      <More count={due.length - SHOWN} />
    </>
  );
}
