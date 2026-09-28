import type { Flow } from "@lifeos/contracts";

export type Month = { year: number; month: number };

export type Dated = { flow: Flow; on: string };

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

export function dayLabel(on: string): string {
  const [y, m, d] = on.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function iso(month: Month, day: number): string {
  const mm = String(month.month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${month.year}-${mm}-${dd}`;
}

export function dayBefore(on: string): string {
  const [y, m, d] = on.split("-").map(Number);
  const back = new Date(y, m - 1, d - 1);
  return `${back.getFullYear()}-${String(back.getMonth() + 1).padStart(2, "0")}-${String(
    back.getDate(),
  ).padStart(2, "0")}`;
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
        : iso(month, Math.min(day, daysInMonth(month)));

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

export function todayIso(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
}

export function daysUntil(on: string, today = new Date()): number {
  const [y, m, d] = on.split("-").map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  return Math.round((then - now) / 86400000);
}

export function whenLabel(on: string, today = new Date()): string {
  const days = daysUntil(on, today);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function settled(rows: Dated[], today = new Date()): Dated[] {
  const now = todayIso(today);
  return rows.filter((one) => one.on <= now);
}

export function pending(rows: Dated[], today = new Date()): Dated[] {
  const now = todayIso(today);
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
