import type {
  EditScope,
  EventColor,
  EventType,
  LifeEvent,
  Recurrence,
} from "@lifeos/contracts";
import { dayKey, shiftDay } from "@/lib/recurrence";
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
  series_id: string | null;
  recurrence: Recurrence | null;
  occurrence_date: string | null;
  cancelled: boolean;
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
    ...(row.series_id ? { seriesId: row.series_id } : {}),
    ...(row.recurrence ? { recurrence: row.recurrence } : {}),
    ...(row.occurrence_date ? { occurrenceDate: row.occurrence_date } : {}),
    ...(row.cancelled ? { cancelled: true } : {}),
    ...row.data,
  } as LifeEvent;
}

function toRow(event: LifeEvent): Row {
  const {
    id,
    userId: owner,
    type,
    title,
    start,
    end,
    allDay,
    color,
    notes,
    seriesId,
    recurrence,
    occurrenceDate,
    cancelled,
    ...rest
  } = event as LifeEvent & Record<string, unknown>;
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
    series_id: seriesId ?? null,
    recurrence: recurrence ?? null,
    occurrence_date: occurrenceDate ?? null,
    cancelled: cancelled ?? false,
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

function master(seriesId: string): LifeEvent | undefined {
  return cache.find((e) => e.recurrence && (e.seriesId ?? e.id) === seriesId);
}

export async function saveOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  const seriesId = event.seriesId;
  if (!seriesId || !event.occurrenceDate) {
    await (cache.some((e) => e.id === event.id) ? updateEvent : addEvent)(event);
    return;
  }

  const head = master(seriesId);
  const date = event.occurrenceDate;

  if (scope === "one") {
    const existing = cache.find(
      (e) => e.seriesId === seriesId && e.occurrenceDate === date,
    );
    const patch = {
      ...event,
      id: existing?.id ?? crypto.randomUUID(),
      seriesId,
      occurrenceDate: date,
      recurrence: undefined,
      cancelled: false,
    } as LifeEvent;
    await (existing ? updateEvent : addEvent)(patch);
    return;
  }

  if (scope === "all") {
    if (!head) return;
    await updateEvent({
      ...event,
      id: head.id,
      seriesId,
      occurrenceDate: undefined,
      recurrence: head.recurrence,
    } as LifeEvent);
    return;
  }

  if (!head) return;
  await updateEvent({
    ...head,
    recurrence: { ...head.recurrence!, until: shiftDay(date, -1) },
  } as LifeEvent);
  await dropPatches(seriesId, date);
  const nextId = crypto.randomUUID();
  await addEvent({
    ...event,
    id: nextId,
    seriesId: nextId,
    occurrenceDate: undefined,
    recurrence: event.recurrence ?? head.recurrence,
  } as LifeEvent);
}

async function dropPatches(seriesId: string, from: string): Promise<void> {
  const gone = cache.filter(
    (e) =>
      e.seriesId === seriesId &&
      e.occurrenceDate !== undefined &&
      e.occurrenceDate >= from,
  );
  if (!gone.length) return;
  const ids = gone.map((e) => e.id);
  cache = cache.filter((e) => !ids.includes(e.id));
  emit();
  await supabase.from("events").delete().in("id", ids);
}

export async function removeOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  const seriesId = event.seriesId;
  if (!seriesId || !event.occurrenceDate) {
    await deleteEvent(event.id);
    return;
  }

  const head = master(seriesId);
  const date = event.occurrenceDate;

  if (scope === "one") {
    const existing = cache.find(
      (e) => e.seriesId === seriesId && e.occurrenceDate === date,
    );
    const mark = {
      ...event,
      id: existing?.id ?? crypto.randomUUID(),
      seriesId,
      occurrenceDate: date,
      recurrence: undefined,
      cancelled: true,
    } as LifeEvent;
    await (existing ? updateEvent : addEvent)(mark);
    return;
  }

  if (scope === "all") {
    const ids = cache
      .filter((e) => e.seriesId === seriesId || e.id === head?.id)
      .map((e) => e.id);
    cache = cache.filter((e) => !ids.includes(e.id));
    emit();
    await supabase.from("events").delete().in("id", ids);
    return;
  }

  if (!head) return;
  await dropPatches(seriesId, date);
  if (dayKey(head.start) >= date) {
    await deleteEvent(head.id);
    return;
  }
  await updateEvent({
    ...head,
    recurrence: { ...head.recurrence!, until: shiftDay(date, -1) },
  } as LifeEvent);
}

export function exportEvents(): string {
  return JSON.stringify(cache, null, 2);
}
