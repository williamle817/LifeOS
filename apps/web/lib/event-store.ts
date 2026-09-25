import type { EventColor, EventType, LifeEvent } from "@lifeos/contracts";
import { supabase } from "@/lib/supabase";

const NONE: LifeEvent[] = [];

let cache: LifeEvent[] = NONE;
let userId: string | null = null;
const listeners = new Set<() => void>();

type Row = {
  id: string;
  user_id: string;
  type: EventType;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: EventColor | null;
  notes: string | null;
  data: Record<string, unknown>;
};

function emit(): void {
  for (const listener of listeners) listener();
}

function toEvent(row: Row): LifeEvent {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    start: row.start_at,
    end: row.end_at,
    ...(row.all_day ? { allDay: true } : {}),
    ...(row.color ? { color: row.color } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    ...row.data,
  } as LifeEvent;
}

function toRow(event: LifeEvent): Row {
  const { id, userId: owner, type, title, start, end, allDay, color, notes, ...rest } =
    event as LifeEvent & Record<string, unknown>;
  return {
    id,
    user_id: owner,
    type,
    title,
    start_at: start,
    end_at: end,
    all_day: allDay ?? false,
    color: color ?? null,
    notes: notes ?? null,
    data: rest as Record<string, unknown>,
  };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): LifeEvent[] {
  return cache;
}

export function getServerSnapshot(): LifeEvent[] {
  return NONE;
}

export function currentUserId(): string | null {
  return userId;
}

export async function loadEvents(): Promise<void> {
  const { data: me } = await supabase.from("users").select("id").single();
  if (!me) return;
  userId = me.id;

  const { data } = await supabase.from("events").select("*");
  cache = data ? (data as Row[]).map(toEvent) : NONE;
  emit();
}

export async function addEvent(event: LifeEvent): Promise<void> {
  cache = [...cache, event];
  emit();
  await supabase.from("events").insert(toRow(event));
}

export async function updateEvent(event: LifeEvent): Promise<void> {
  cache = cache.map((e) => (e.id === event.id ? event : e));
  emit();
  await supabase.from("events").update(toRow(event)).eq("id", event.id);
}

export async function deleteEvent(id: string): Promise<void> {
  cache = cache.filter((e) => e.id !== id);
  emit();
  await supabase.from("events").delete().eq("id", id);
}

export function exportEvents(): string {
  return JSON.stringify(cache, null, 2);
}
