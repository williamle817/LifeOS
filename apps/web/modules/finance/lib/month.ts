import type { Flow } from "@lifeos/contracts";
import { daysBetween, isoDay } from "@/lib/dates";

export type Month = { year: number; month: number };

export type Dated = {
  flow: Flow;
  on: string;
  series?: boolean;
  from?: "work" | "dining";
};

export function thisMonth(today = new Date()): Month {
  return { year: today.getFullYear(), month: today.getMonth() };
}

export function shift(month: Month, by: number): Month {
  const total = month.year * 12 + month.month + by;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function sameMonth(a: Month, b: Month): boolean {
  return a.year === b.year && a.month === b.month;
}

export function monthLabel(month: Month): string {
  return new Date(month.year, month.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(month: Month): number {
  return new Date(month.year, month.month + 1, 0).getDate();
}

export function dayOf(month: Month, day: number): string {
  return isoDay(
    new Date(month.year, month.month, Math.min(day, daysInMonth(month))),
  );
}

export function dateIn(flow: Flow, month: Month): string | null {
  const [year, one, day] = flow.on.split("-").map(Number);
  if (!year || !one || !day) return null;

  const from = { year, month: one - 1 };
  const started = month.year * 12 + month.month >= from.year * 12 + from.month;

  const on =
    flow.repeat === "once"
      ? sameMonth(from, month)
        ? flow.on
        : null
      : !started || (flow.repeat === "yearly" && from.month !== month.month)
        ? null
        : dayOf(month, day);

  if (!on) return null;
  if (flow.until && on > flow.until) return null;
  if (flow.skips?.includes(on)) return null;
  return on;
}

export function inMonth(flows: Flow[], month: Month): Dated[] {
  const rows: Dated[] = [];
  for (const flow of flows) {
    const on = dateIn(flow, month);
    if (on) rows.push({ flow, on });
  }
  return rows.sort((a, b) => {
    if (a.on !== b.on) return a.on < b.on ? -1 : 1;
    return (a.flow.position ?? 0) - (b.flow.position ?? 0);
  });
}

export function whenLabel(on: string, today = new Date()): string {
  const days = daysBetween(isoDay(today), on);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function newestFirst(rows: Dated[]): Dated[] {
  return [...rows].sort((a, b) => {
    if (a.on !== b.on) return a.on > b.on ? -1 : 1;
    return (a.flow.position ?? 0) - (b.flow.position ?? 0);
  });
}

export function settled(rows: Dated[], today = new Date()): Dated[] {
  const now = isoDay(today);
  return rows.filter((one) => one.on <= now);
}

export function pending(rows: Dated[], today = new Date()): Dated[] {
  const now = isoDay(today);
  return rows.filter((one) => one.on > now);
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function total(rows: Dated[]): number {
  let sum = 0;
  for (const one of rows) sum = round(sum + one.flow.amount);
  return sum;
}

export function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
