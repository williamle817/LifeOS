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

export function costOf(event: LifeEvent): number {
  if (event.type !== "dining") return 0;
  return round(event.amount ?? 0);
}

function day(month: Month, at: number): string {
  const mm = String(month.month + 1).padStart(2, "0");
  return `${month.year}-${mm}-${String(at).padStart(2, "0")}`;
}

export function rowId(event: LifeEvent): string {
  return `from-${event.id}`;
}

export function eventsIn(
  events: LifeEvent[],
  month: Month,
  type: "work" | "dining",
): LifeEvent[] {
  const first = day(month, 1);
  const last = day(month, daysInMonth(month));

  return expand(
    events,
    new Date(month.year, month.month, 1),
    new Date(month.year, month.month, daysInMonth(month)),
  ).filter((one) => {
    if (one.type !== type) return false;
    const on = dayKey(one.start);
    return on >= first && on <= last;
  });
}

function line(event: LifeEvent, type: "work" | "dining"): Dated {
  const on = dayKey(event.start);
  const place = event.type === type ? event.place : undefined;

  return {
    on,
    series: Boolean(event.seriesId),
    from: type,
    flow: {
      id: rowId(event),
      userId: event.userId,
      kind: type === "work" ? "income" : "expense",
      title: event.title,
      category: type === "work" ? "Work" : "Dining out",
      ...(place ? { place } : {}),
      on,
      amount: type === "work" ? payFor(event) : costOf(event),
      repeat: "once",
      eventId: event.id,
    } satisfies Flow,
  };
}

function byDay(a: Dated, b: Dated): number {
  if (a.on !== b.on) return a.on < b.on ? -1 : 1;
  return a.flow.title.localeCompare(b.flow.title);
}

export function shiftsIn(events: LifeEvent[], month: Month): Dated[] {
  return eventsIn(events, month, "work")
    .map((one) => line(one, "work"))
    .sort(byDay);
}

export function mealsIn(events: LifeEvent[], month: Month): Dated[] {
  return eventsIn(events, month, "dining")
    .map((one) => line(one, "dining"))
    .sort(byDay);
}

export function eventFor(
  events: LifeEvent[],
  month: Month,
  flowId: string,
): LifeEvent | undefined {
  return [
    ...eventsIn(events, month, "work"),
    ...eventsIn(events, month, "dining"),
  ].find((one) => rowId(one) === flowId);
}

export async function saveFromSchedule(
  event: LifeEvent,
  next: { title: string; place?: string; amount?: number },
  scope: EditScope,
): Promise<void> {
  const edited = {
    ...event,
    title: next.title,
    place: next.place,
    ...(event.type === "dining" ? { amount: next.amount ?? 0 } : {}),
  } as LifeEvent;
  await saveOccurrence(edited, scope);
}

export async function removeFromSchedule(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await removeOccurrence(event, scope);
}
