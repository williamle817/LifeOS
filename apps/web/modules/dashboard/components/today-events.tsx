"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { tint } from "@/components/styles";
import {
  ensureEvents,
  eventsOn,
  eventsServer,
  eventsSnapshot,
  subscribeEvents,
} from "@/lib/for-dashboard";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/modules/dashboard/lib/today";
import { More, SHOWN } from "@/modules/dashboard/components/panel";

function clock(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodayEvents() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const events = useSyncExternalStore(
    subscribeEvents,
    eventsSnapshot,
    eventsServer,
  );

  useEffect(() => {
    void ensureEvents();
  }, []);

  const shown = useMemo(
    () => (day ? eventsOn(events, day) : []),
    [events, day],
  );

  if (!day) return null;
  if (!shown.length) {
    return (
      <p className="text-[15px] leading-relaxed text-ink-muted">
        Nothing on your calendar today.
      </p>
    );
  }

  return (
    <>
      <ul aria-label="Today's events" className="grid gap-2">
        {shown.slice(0, SHOWN).map((event) => {
          const color = event.color ?? "blue";
          return (
            <li
              key={event.id}
              style={tint(color)}
              className="flex items-center gap-3 rounded-card border px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1 text-sm font-semibold break-words">
                {event.title}
              </span>
              <span className="order-first flex w-16 shrink-0 flex-col text-xs tabular-nums">
                {event.allDay ? (
                  <span className="font-semibold">All day</span>
                ) : (
                  <>
                    <span className="font-semibold">{clock(event.start)}</span>
                    <span style={{ color: `var(--event-${color}-ink-muted)` }}>
                      {clock(event.end)}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <More count={shown.length - SHOWN} />
    </>
  );
}
