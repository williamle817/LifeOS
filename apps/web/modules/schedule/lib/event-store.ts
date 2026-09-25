import type {
  EditScope,
  EventColor,
  EventType,
  LifeEvent,
  Recurrence,
} from "@lifeos/contracts";
import { dayKey, shiftDay } from "@/modules/schedule/lib/recurrence";
import { supabase } from "@/lib/supabase";

const NONE: LifeEvent[] = [];

let cache: LifeEvent[] = NONE;
let userId: string | null = null;
let lastError: string | null = null;
let undoTo: LifeEvent[] | null = null;
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
    user_id: owner || (userId ?? ""),
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

export function lastWriteError(): string | null {
  return lastError;
}

export function canUndo(): boolean {
  return undoTo !== null;
}

export async function undo(): Promise<void> {
  if (!undoTo) return;
  const target = undoTo;
  undoTo = null;
  const before = new Map(cache.map((e) => [e.id, e]));
  const after = new Map(target.map((e) => [e.id, e]));

  const gone = [...before.keys()].filter((id) => !after.has(id));
  const back = target.filter((e) => !before.has(e.id));
  const fixed = target.filter(
    (e) =>
      before.has(e.id) &&
      JSON.stringify(before.get(e.id)) !== JSON.stringify(e),
  );

  cache = target;
  emit();

  if (gone.length) {
    await guard(supabase.from("events").delete().in("id", gone));
  }
  if (back.length) {
    await guard(supabase.from("events").insert(back.map(toRow)));
  }
  for (const e of fixed) {
    await guard(supabase.from("events").update(toRow(e)).eq("id", e.id));
  }
}

let loading: Promise<void> | null = null;

export async function ensureLoaded(): Promise<void> {
  if (userId) return;
  loading ??= loadEvents().finally(() => {
    loading = null;
  });
  await loading;
}

export async function loadEvents(): Promise<void> {
  const { data: me } = await supabase.from("users").select("id").single();
  if (!me) return;
  userId = me.id;

  const { data } = await supabase.from("events").select("*");
  cache = data ? (data as Row[]).map(toEvent) : NONE;
  emit();
}

async function guard(
  run: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await run;
  if (!error) return;
  lastError = error.message;
  await loadEvents();
  emit();
}

export async function addEvent(event: LifeEvent): Promise<void> {
  lastError = null;
  cache = [...cache, event];
  emit();
  await guard(supabase.from("events").insert(toRow(event)));
}

export async function updateEvent(event: LifeEvent): Promise<void> {
  cache = cache.map((e) => (e.id === event.id ? event : e));
  emit();
  await guard(supabase.from("events").update(toRow(event)).eq("id", event.id));
}

export async function deleteEvent(id: string): Promise<void> {
  cache = cache.filter((e) => e.id !== id);
  emit();
  await guard(supabase.from("events").delete().eq("id", id));
}

function withTime(dateFrom: string, timeFrom: string): string {
  const base = new Date(dateFrom);
  const time = new Date(timeFrom);
  base.setHours(
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  );
  return base.toISOString();
}

function master(seriesId: string): LifeEvent | undefined {
  return cache.find((e) => e.recurrence && (e.seriesId ?? e.id) === seriesId);
}

export async function saveOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await ensureLoaded();
  undoTo = cache;
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
    const span = new Date(event.end).getTime() - new Date(event.start).getTime();
    const start = event.allDay
      ? head.start
      : withTime(head.start, event.start);
    const end = event.allDay
      ? head.end
      : new Date(new Date(start).getTime() + span).toISOString();
    await updateEvent({
      ...event,
      id: head.id,
      seriesId,
      occurrenceDate: undefined,
      recurrence: event.recurrence ?? head.recurrence,
      start,
      end,
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
  await ensureLoaded();
  undoTo = cache;
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
