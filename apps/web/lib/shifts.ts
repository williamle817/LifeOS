import type { Flow, LifeEvent } from "@lifeos/contracts";
import { dayKey, expand } from "@/modules/schedule/lib/recurrence";
import {
  daysInMonth,
  round,
  type Dated,
  type Month,
} from "@/modules/finance/lib/month";

const HOUR = 60 * 60 * 1000;

export {
  subscribe as subscribeEvents,
  getSnapshot as eventsSnapshot,
  getServerSnapshot as eventsServer,
  ensureLoaded as ensureEvents,
} from "@/modules/schedule/lib/event-store";

export function hoursOf(event: LifeEvent): number {
  if (event.allDay) return 0;
  const span = new Date(event.end).getTime() - new Date(event.start).getTime();
  return span > 0 ? span / HOUR : 0;
}

export function payFor(event: LifeEvent): number {
  if (event.type !== "work") return 0;
  return round(hoursOf(event) * (event.wage ?? 0) + (event.tips ?? 0));
}

function day(month: Month, at: number): string {
  const mm = String(month.month + 1).padStart(2, "0");
  return `${month.year}-${mm}-${String(at).padStart(2, "0")}`;
}

export function shiftsIn(events: LifeEvent[], month: Month): Dated[] {
  const first = day(month, 1);
  const last = day(month, daysInMonth(month));
  const rows: Dated[] = [];

  for (const one of expand(
    events,
    new Date(month.year, month.month, 1),
    new Date(month.year, month.month, daysInMonth(month)),
  )) {
    if (one.type !== "work") continue;
    const on = dayKey(one.start);
    if (on < first || on > last) continue;

    rows.push({
      on,
      flow: {
        id: `shift-${one.id}`,
        userId: one.userId,
        kind: "income",
        title: one.title,
        ...(one.place ? { place: one.place } : {}),
        on,
        amount: payFor(one),
        repeat: "once",
        eventId: one.id,
      } satisfies Flow,
    });
  }

  return rows.sort((a, b) => {
    if (a.on !== b.on) return a.on < b.on ? -1 : 1;
    return a.flow.title.localeCompare(b.flow.title);
  });
}
