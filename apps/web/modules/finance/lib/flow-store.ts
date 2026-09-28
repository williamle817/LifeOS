import type { Flow, FlowKind, FlowRepeat } from "@lifeos/contracts";
import { supabase } from "@/lib/supabase";

const NONE: Flow[] = [];

let cache: Flow[] = NONE;
let userId: string | null = null;
let lastError: string | null = null;
const listeners = new Set<() => void>();

type FlowRow = {
  id: string;
  user_id: string;
  kind: FlowKind;
  title: string;
  place: string | null;
  on_date: string;
  amount: number;
  recur: FlowRepeat;
  event_id: string | null;
  position: number | null;
};

function emit(): void {
  for (const listener of listeners) listener();
}

function owner(value?: string): string {
  return value || (userId ?? "");
}

function toFlow(row: FlowRow): Flow {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    ...(row.place ? { place: row.place } : {}),
    on: row.on_date,
    amount: Number(row.amount),
    repeat: row.recur,
    ...(row.event_id ? { eventId: row.event_id } : {}),
    position: row.position ?? 0,
  };
}

function flowRow(value: Flow): FlowRow {
  return {
    id: value.id,
    user_id: owner(value.userId),
    kind: value.kind,
    title: value.title,
    place: value.place ?? null,
    on_date: value.on,
    amount: value.amount,
    recur: value.repeat,
    event_id: value.eventId ?? null,
    position: value.position ?? 0,
  };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Flow[] {
  return cache;
}

export function getServerSnapshot(): Flow[] {
  return NONE;
}

export function currentUserId(): string | null {
  return userId;
}

export function lastWriteError(): string | null {
  return lastError;
}

let loading: Promise<void> | null = null;

export async function ensureLoaded(): Promise<void> {
  if (userId) return;
  loading ??= loadFlows().finally(() => {
    loading = null;
  });
  await loading;
}

export async function loadFlows(): Promise<void> {
  const { data: me } = await supabase.from("users").select("id").single();
  if (!me) return;
  userId = me.id;

  const { data } = await supabase.from("flows").select("*");
  cache = ((data ?? []) as FlowRow[]).map(toFlow);
  emit();
}

async function guard(
  run: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await run;
  if (!error) return;
  lastError = error.message;
  await loadFlows();
  emit();
}

export async function saveFlow(flow: Flow): Promise<void> {
  await ensureLoaded();
  lastError = null;

  const exists = cache.some((one) => one.id === flow.id);
  const saved = {
    ...flow,
    userId: owner(flow.userId),
    position:
      flow.position ??
      (exists ? 0 : cache.filter((one) => one.kind === flow.kind).length),
  };

  cache = exists
    ? cache.map((one) => (one.id === saved.id ? saved : one))
    : [...cache, saved];
  emit();

  await guard(
    exists
      ? supabase.from("flows").update(flowRow(saved)).eq("id", saved.id)
      : supabase.from("flows").insert(flowRow(saved)),
  );
}

export async function deleteFlow(id: string): Promise<void> {
  await ensureLoaded();
  lastError = null;
  cache = cache.filter((one) => one.id !== id);
  emit();
  await guard(supabase.from("flows").delete().eq("id", id));
}

export async function reorderFlows(ids: string[]): Promise<void> {
  await ensureLoaded();
  lastError = null;

  const next = cache.map((flow) => {
    const at = ids.indexOf(flow.id);
    return at < 0 || flow.position === at ? flow : { ...flow, position: at };
  });
  const changed = next.filter((flow, i) => flow !== cache[i]);

  cache = next;
  emit();

  for (const flow of changed) {
    await guard(supabase.from("flows").update(flowRow(flow)).eq("id", flow.id));
  }
}
