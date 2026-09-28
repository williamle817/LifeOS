import type { EditScope, Flow, LifeEvent } from "@lifeos/contracts";
import { dayKey, expand } from "@/modules/schedule/lib/recurrence";
import {
  removeOccurrence,
  saveOccurrence,
} from "@/modules/schedule/lib/event-store";
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

export function shiftId(event: LifeEvent): string {
  return `shift-${event.id}`;
}

export function workIn(events: LifeEvent[], month: Month): LifeEvent[] {
  const first = day(month, 1);
  const last = day(month, daysInMonth(month));

  return expand(
    events,
    new Date(month.year, month.month, 1),
    new Date(month.year, month.month, daysInMonth(month)),
  ).filter((one) => {
    if (one.type !== "work") return false;
    const on = dayKey(one.start);
    return on >= first && on <= last;
  });
}

export function shiftsIn(events: LifeEvent[], month: Month): Dated[] {
  return workIn(events, month)
    .map((one) => ({
      on: dayKey(one.start),
      series: Boolean(one.seriesId),
      flow: {
        id: shiftId(one),
        userId: one.userId,
        kind: "income",
        title: one.title,
        category: "Work",
        ...(one.type === "work" && one.place ? { place: one.place } : {}),
        on: dayKey(one.start),
        amount: payFor(one),
        repeat: "once",
        eventId: one.id,
      } satisfies Flow,
    }))
    .sort((a, b) => {
      if (a.on !== b.on) return a.on < b.on ? -1 : 1;
      return a.flow.title.localeCompare(b.flow.title);
    });
}

export function shiftFor(
  events: LifeEvent[],
  month: Month,
  flowId: string,
): LifeEvent | undefined {
  return workIn(events, month).find((one) => shiftId(one) === flowId);
}

export async function saveShift(
  event: LifeEvent,
  title: string,
  place: string | undefined,
  scope: EditScope,
): Promise<void> {
  await saveOccurrence(
    { ...event, title, place } as LifeEvent,
    scope,
  );
}

export async function removeShift(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await removeOccurrence(event, scope);
}
