import type { LifeEvent, Recurrence } from "@lifeos/contracts";

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(value: string): string {
  return value.length <= 10 ? value : toLocalDay(new Date(value));
}

function toLocalDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDay(d);
}

function step(d: Date, rule: Recurrence, times = 1): Date {
  const next = new Date(d);
  if (rule.freq === "daily") next.setDate(next.getDate() + rule.interval * times);
  else if (rule.freq === "weekly")
    next.setDate(next.getDate() + 7 * rule.interval * times);
  else next.setMonth(next.getMonth() + rule.interval * times);
  return next;
}

function seek(first: Date, rule: Recurrence, from: Date): Date {
  if (from <= first) return first;
  if (rule.freq === "monthly") {
    const months =
      (from.getFullYear() - first.getFullYear()) * 12 +
      (from.getMonth() - first.getMonth());
    return step(first, rule, Math.floor(months / rule.interval));
  }
  const span = rule.freq === "weekly" ? 7 * rule.interval : rule.interval;
  const days = Math.floor((from.getTime() - first.getTime()) / DAY);
  return step(first, rule, Math.floor(days / span));
}

function moveTo(value: string, from: string, to: string): string {
  if (value.length <= 10) return to;
  const offset = new Date(value).getTime() - new Date(`${from}T00:00:00`).getTime();
  return new Date(new Date(`${to}T00:00:00`).getTime() + offset).toISOString();
}

export function occurrenceId(seriesId: string, date: string): string {
  return `${seriesId}::${date}`;
}

export function expand(
  rows: LifeEvent[],
  from: Date,
  to: Date,
): LifeEvent[] {
  const masters = rows.filter((r) => r.recurrence);
  const singles = rows.filter((r) => !r.recurrence && !r.seriesId);
  const patches = new Map<string, LifeEvent>();

  for (const row of rows) {
    if (!row.seriesId || !row.occurrenceDate) continue;
    patches.set(`${row.seriesId}::${row.occurrenceDate}`, row);
  }

  const out = [...singles];

  for (const master of masters) {
    const rule = master.recurrence;
    if (!rule) continue;
    const seriesId = master.seriesId ?? master.id;
    const firstDay = dayKey(master.start);
    const first = new Date(`${firstDay}T00:00:00`);
    let cursor = seek(first, rule, new Date(from.getTime() - DAY));
    const limit = new Date(to.getTime() + DAY);
    let guard = 0;

    while (cursor <= limit && guard < 800) {
      guard += 1;
      const date = toLocalDay(cursor);
      if (rule.until && date > rule.until) break;

      if (cursor.getTime() >= from.getTime() - DAY) {
        const patch = patches.get(`${seriesId}::${date}`);
        if (!patch) {
          out.push({
            ...master,
            id: occurrenceId(seriesId, date),
            seriesId,
            occurrenceDate: date,
            recurrence: undefined,
            start: moveTo(master.start, firstDay, date),
            end: moveTo(master.end, firstDay, date),
          } as LifeEvent);
        } else if (!patch.cancelled) {
          out.push({ ...patch, recurrence: undefined } as LifeEvent);
        }
      }

      cursor = step(cursor, rule);
    }
  }

  return out;
}
