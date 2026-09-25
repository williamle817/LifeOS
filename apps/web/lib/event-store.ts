import type { LifeEvent } from "@lifeos/contracts";

const KEY = "lifeos.events";
const NONE: LifeEvent[] = [];

let cache: LifeEvent[] | null = null;
const listeners = new Set<() => void>();

function read(): LifeEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LifeEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: LifeEvent[]): void {
  cache = events;
  localStorage.setItem(KEY, JSON.stringify(events));
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): LifeEvent[] {
  cache ??= read();
  return cache;
}

export function getServerSnapshot(): LifeEvent[] {
  return NONE;
}

export function addEvent(event: LifeEvent): void {
  write([...getSnapshot(), event]);
}

export function updateEvent(event: LifeEvent): void {
  write(getSnapshot().map((e) => (e.id === event.id ? event : e)));
}

export function deleteEvent(id: string): void {
  write(getSnapshot().filter((e) => e.id !== id));
}
