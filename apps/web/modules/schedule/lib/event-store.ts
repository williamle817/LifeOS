import type {
  EditScope,
  EventColor,
  EventType,
  LifeEvent,
  Recurrence,
} from "@lifeos/contracts";
import { shiftDay } from "@/lib/dates";
import { createStore, currentUserId, owner } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { dayKey } from "@/modules/schedule/lib/recurrence";

export { currentUserId };

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
    userId,
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
    user_id: owner(userId),
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

const NONE: LifeEvent[] = [];

const store = createStore(NONE, async () => {
  const { data } = await supabase.from("events").select("*");
  return data ? (data as Row[]).map(toEvent) : NONE;
});

export const {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  lastWriteError,
  ensureLoaded,
} = store;

let undoTo: LifeEvent[] | null = null;

export function canUndo(): boolean {
  return undoTo !== null;
}

export async function undo(): Promise<void> {
  if (!undoTo) return;
  const target = undoTo;
  undoTo = null;
  const before = new Map(getSnapshot().map((e) => [e.id, e]));
  const after = new Set(target.map((e) => e.id));

  const gone = [...before.keys()].filter((id) => !after.has(id));
  const back = target.filter(
    (e) => JSON.stringify(before.get(e.id)) !== JSON.stringify(e),
  );

  store.set(target);
  if (gone.length) {
    await store.write(supabase.from("events").delete().in("id", gone));
  }
  if (back.length) {
    await store.write(supabase.from("events").upsert(back.map(toRow)));
  }
}

export async function addEvent(event: LifeEvent): Promise<void> {
  store.set([...getSnapshot(), event]);
  await store.write(supabase.from("events").insert(toRow(event)));
}

export async function updateEvent(event: LifeEvent): Promise<void> {
  store.set(getSnapshot().map((e) => (e.id === event.id ? event : e)));
  await store.write(
    supabase.from("events").update(toRow(event)).eq("id", event.id),
  );
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteMany([id]);
}

async function deleteMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  store.set(getSnapshot().filter((e) => !ids.includes(e.id)));
  await store.write(supabase.from("events").delete().in("id", ids));
}

async function begin(): Promise<void> {
  await store.begin();
  undoTo = getSnapshot();
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
  return getSnapshot().find(
    (e) => e.recurrence && (e.seriesId ?? e.id) === seriesId,
  );
}

async function patch(event: LifeEvent, cancelled: boolean): Promise<void> {
  const existing = getSnapshot().find(
    (e) =>
      e.seriesId === event.seriesId &&
      e.occurrenceDate === event.occurrenceDate,
  );
  await (existing ? updateEvent : addEvent)({
    ...event,
    id: existing?.id ?? crypto.randomUUID(),
    recurrence: undefined,
    cancelled,
  } as LifeEvent);
}

async function cut(head: LifeEvent, seriesId: string, from: string): Promise<void> {
  await deleteMany(
    getSnapshot()
      .filter(
        (e) =>
          e.seriesId === seriesId &&
          e.occurrenceDate !== undefined &&
          e.occurrenceDate >= from,
      )
      .map((e) => e.id),
  );
  if (dayKey(head.start) >= from) {
    await deleteEvent(head.id);
    return;
  }
  await updateEvent({
    ...head,
    recurrence: { ...head.recurrence!, until: shiftDay(from, -1) },
  } as LifeEvent);
}

export async function saveOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await begin();
  const seriesId = event.seriesId;
  if (!seriesId || !event.occurrenceDate) {
    const exists = getSnapshot().some((e) => e.id === event.id);
    await (exists ? updateEvent : addEvent)(event);
    return;
  }

  if (scope === "one") {
    await patch(event, false);
    return;
  }

  const head = master(seriesId);
  if (!head) return;

  if (scope === "all") {
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

  await cut(head, seriesId, event.occurrenceDate);
  const nextId = crypto.randomUUID();
  await addEvent({
    ...event,
    id: nextId,
    seriesId: nextId,
    occurrenceDate: undefined,
    recurrence: event.recurrence ?? head.recurrence,
  } as LifeEvent);
}

export async function duplicateOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await begin();
  const id = crypto.randomUUID();
  const seriesId = event.seriesId;

  if (!seriesId || !event.occurrenceDate) {
    await addEvent({ ...event, id, cancelled: false } as LifeEvent);
    return;
  }

  if (scope === "one") {
    await addEvent({
      ...event,
      id,
      seriesId: undefined,
      occurrenceDate: undefined,
      recurrence: undefined,
      cancelled: false,
    } as LifeEvent);
    return;
  }

  const head = master(seriesId);
  if (!head) return;

  await addEvent({
    ...(scope === "all" ? head : event),
    id,
    seriesId: id,
    occurrenceDate: undefined,
    recurrence: scope === "all" ? head.recurrence : (event.recurrence ?? head.recurrence),
    cancelled: false,
  } as LifeEvent);
}

export async function removeOccurrence(
  event: LifeEvent,
  scope: EditScope,
): Promise<void> {
  await begin();
  const seriesId = event.seriesId;
  if (!seriesId || !event.occurrenceDate) {
    await deleteEvent(event.id);
    return;
  }

  if (scope === "one") {
    await patch(event, true);
    return;
  }

  const head = master(seriesId);

  if (scope === "all") {
    await deleteMany(
      getSnapshot()
        .filter((e) => e.seriesId === seriesId || e.id === head?.id)
        .map((e) => e.id),
    );
    return;
  }

  if (head) await cut(head, seriesId, event.occurrenceDate);
}
