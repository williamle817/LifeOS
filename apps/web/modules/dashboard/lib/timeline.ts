import type { LifeEvent } from "@lifeos/contracts";

export type Moment = "all-day" | "past" | "now" | "next" | "later";

export type Slot =
  | { kind: "event"; event: LifeEvent; moment: Moment; minutes?: number }
  | { kind: "now" };

function time(value: string): number {
  return new Date(value).getTime();
}

export function timeline(
  events: LifeEvent[],
  now: number,
  cap: number,
): { slots: Slot[]; hidden: number } {
  const allDay = events.filter((one) => one.allDay).slice(0, cap);
  const timed = events.filter((one) => !one.allDay);
  const started = timed.filter((one) => time(one.start) <= now).length;
  const room = Math.max(0, cap - allDay.length);
  const skip = Math.min(started, Math.max(0, timed.length - room));
  const shown = timed.slice(skip, skip + room);

  const slots: Slot[] = allDay.map((event) => ({
    kind: "event",
    event,
    moment: "all-day",
  }));

  let marked = false;
  let seenNext = false;
  for (const event of shown) {
    const start = time(event.start);
    if (!marked && start > now) {
      slots.push({ kind: "now" });
      marked = true;
    }
    if (time(event.end) <= now) {
      slots.push({ kind: "event", event, moment: "past" });
    } else if (start <= now) {
      slots.push({ kind: "event", event, moment: "now" });
    } else if (seenNext) {
      slots.push({ kind: "event", event, moment: "later" });
    } else {
      seenNext = true;
      slots.push({
        kind: "event",
        event,
        moment: "next",
        minutes: Math.round((start - now) / 60_000),
      });
    }
  }
  if (!marked && shown.length) slots.push({ kind: "now" });

  return { slots, hidden: events.length - allDay.length - shown.length };
}

export function inLabel(minutes: number): string {
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `in ${hours}h ${rest}m` : `in ${hours}h`;
}
