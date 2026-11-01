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
  getMinute,
  getServerMinute,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/today";
import { inLabel, timeline } from "@/modules/dashboard/lib/timeline";
import { More, SHOWN } from "@/modules/dashboard/components/panel";

function clock(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodayEvents() {
  const day = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
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
  const { slots, hidden } = useMemo(
    () => timeline(shown, minute * 60_000, SHOWN),
    [shown, minute],
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
        {slots.map((slot) => {
          if (slot.kind === "now") {
            return (
              <li
                key="now"
                aria-hidden="true"
                className="flex items-center gap-3 py-0.5"
              >
                <span
                  style={{ color: "var(--alert)" }}
                  className="w-16 text-xs font-bold"
                >
                  Now
                </span>
                <span
                  style={{ backgroundColor: "var(--alert)" }}
                  className="h-0.5 flex-1 rounded-full"
                />
              </li>
            );
          }

          const { event, moment } = slot;
          const color = event.color ?? "blue";
          const past = moment === "past";
          return (
            <li
              key={event.id}
              style={
                past
                  ? {
                      ...tint(color),
                      backgroundColor: "transparent",
                      color: "var(--ink-muted)",
                    }
                  : tint(color)
              }
              className="flex items-center gap-3 rounded-card border px-3.5 py-2.5"
            >
              <span
                className={`min-w-0 flex-1 text-sm font-semibold break-words ${
                  past ? "line-through" : ""
                }`}
              >
                {event.title}
              </span>
              {moment === "now" || moment === "next" ? (
                <span
                  style={{ borderColor: `var(--event-${color}-line)` }}
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold"
                >
                  {moment === "now" ? "Now" : inLabel(slot.minutes ?? 0)}
                </span>
              ) : null}
              <span className="order-first flex w-16 shrink-0 flex-col text-xs tabular-nums">
                {event.allDay ? (
                  <span className="font-semibold">All day</span>
                ) : (
                  <>
                    <span className="font-semibold">{clock(event.start)}</span>
                    <span
                      style={{
                        color: past
                          ? "var(--ink-faint)"
                          : `var(--event-${color}-ink-muted)`,
                      }}
                    >
                      {clock(event.end)}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <More count={hidden} />
    </>
  );
}
