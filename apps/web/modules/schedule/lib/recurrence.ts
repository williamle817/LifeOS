import type { LifeEvent, Recurrence } from "@lifeos/contracts";
import { daysBetween, isoDay, parseDay, shiftDay } from "@/lib/dates";

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(value: string): string {
  return value.length <= 10 ? value : isoDay(new Date(value));
}

function nth(first: Date, rule: Recurrence, n: number): Date {
  const out = new Date(first);
  if (rule.freq === "daily" || rule.freq === "weekly") {
    const span = rule.freq === "weekly" ? 7 * rule.interval : rule.interval;
    out.setDate(out.getDate() + span * n);
    return out;
  }
  const months = (rule.freq === "yearly" ? 12 : 1) * rule.interval * n;
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(first.getDate(), last));
  return out;
}

function seek(first: Date, rule: Recurrence, from: Date): number {
  if (from <= first) return 0;
  if (rule.freq === "monthly" || rule.freq === "yearly") {
    const months =
      (from.getFullYear() - first.getFullYear()) * 12 +
      (from.getMonth() - first.getMonth());
    const per = rule.freq === "yearly" ? 12 * rule.interval : rule.interval;
    return Math.floor(months / per);
  }
  const span = rule.freq === "weekly" ? 7 * rule.interval : rule.interval;
  return Math.floor(daysBetween(isoDay(first), isoDay(from)) / span);
}

function moveTo(value: string, days: number): string {
  if (value.length <= 10) return shiftDay(value, days);
  const moved = new Date(value);
  moved.setDate(moved.getDate() + days);
  return moved.toISOString();
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
    patches.set(occurrenceId(row.seriesId, row.occurrenceDate), row);
  }

  const out = [...singles];

  for (const master of masters) {
    const rule = master.recurrence;
    if (!rule) continue;
    const seriesId = master.seriesId ?? master.id;
    const firstDay = dayKey(master.start);
    const first = parseDay(firstDay);
    const limit = new Date(to.getTime() + DAY);
    const lower = new Date(from.getTime() - DAY);
    const picked =
      rule.freq === "weekly" && rule.byDay?.length
        ? weekDates(rule, first, lower, limit)
        : null;

    let n = picked ? 0 : seek(first, rule, lower);
    let cursor = picked ? picked[0] : nth(first, rule, n);
    let guard = 0;

    while (cursor && cursor <= limit && guard < 800) {
      guard += 1;
      const date = isoDay(cursor);
      if (rule.until && date > rule.until) break;

      if (cursor >= lower) {
        const id = occurrenceId(seriesId, date);
        const patch = patches.get(id);
        const days = daysBetween(firstDay, date);
        if (!patch) {
          out.push({
            ...master,
            id,
            seriesId,
            occurrenceDate: date,
            recurrence: rule,
            start: moveTo(master.start, days),
            end: moveTo(master.end, days),
          } as LifeEvent);
        } else if (!patch.cancelled) {
          out.push({ ...patch, recurrence: rule } as LifeEvent);
        }
      }

      n += 1;
      cursor = picked ? picked[n] : nth(first, rule, n);
    }
  }

  return out;
}
