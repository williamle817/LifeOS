const DAY = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDay(day: string, days: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY);
}

export function shortDate(day: string): string {
  return parseDay(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function dueLabel(days: number): string {
  if (days < 0) return days === -1 ? "1 day late" : `${-days} days late`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}
