import { isoDay } from "@/lib/dates";

export function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

export function getSnapshot(): string {
  return isoDay(new Date());
}

export function getServerSnapshot(): string {
  return "";
}
