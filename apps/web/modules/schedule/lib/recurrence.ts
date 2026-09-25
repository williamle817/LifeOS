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
  else if (rule.freq === "yearly")
    next.setFullYear(next.getFullYear() + rule.interval * times);
  else next.setMonth(next.getMonth() + rule.interval * times);
  return next;
}

function seek(first: Date, rule: Recurrence, from: Date): Date {
  if (from <= first) return first;
  if (rule.freq === "monthly" || rule.freq === "yearly") {
    const months =
      (from.getFullYear() - first.getFullYear()) * 12 +
      (from.getMonth() - first.getMonth());
    const per = rule.freq === "yearly" ? 12 * rule.interval : rule.interval;
    return step(first, rule, Math.floor(months / per));
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

function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

function weekDates(rule: Recurrence, first: Date, from: Date, to: Date): Date[] {
  const days = [...(rule.byDay ?? [])].sort((a, b) => a - b);
  if (!days.length) return [];
  const anchor = mondayOf(first);
  const target = mondayOf(from);
  const weeks = Math.floor(
    (target.getTime() - anchor.getTime()) / (7 * DAY) / rule.interval,
  );
  const week = new Date(anchor);
  week.setDate(week.getDate() + Math.max(0, weeks) * 7 * rule.interval);

  const out: Date[] = [];
  let guard = 0;
  while (week <= to && guard < 400) {
    guard += 1;
    for (const d of days) {
      const hit = new Date(week);
      hit.setDate(hit.getDate() + ((d + 6) % 7));
      if (hit >= first && hit >= from && hit <= to) out.push(hit);
    }
    week.setDate(week.getDate() + 7 * rule.interval);
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
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
    const limit = new Date(to.getTime() + DAY);
    const lower = new Date(from.getTime() - DAY);
    const picked =
      rule.freq === "weekly" && rule.byDay?.length
        ? weekDates(rule, first, lower, limit)
        : null;

    let cursor = picked ? picked[0] : seek(first, rule, lower);
    let index = 0;
    let guard = 0;

    while (cursor && cursor <= limit && guard < 800) {
      guard += 1;
      const date = toLocalDay(cursor);
      if (rule.until && date > rule.until) break;

      if (cursor >= lower) {
        const patch = patches.get(`${seriesId}::${date}`);
        if (!patch) {
          out.push({
            ...master,
            id: occurrenceId(seriesId, date),
            seriesId,
            occurrenceDate: date,
            recurrence: rule,
            start: moveTo(master.start, firstDay, date),
            end: moveTo(master.end, firstDay, date),
          } as LifeEvent);
        } else if (!patch.cancelled) {
          out.push({ ...patch, recurrence: rule } as LifeEvent);
        }
      }

      index += 1;
      cursor = picked ? picked[index] : step(cursor, rule);
    }
  }

  return out;
}
