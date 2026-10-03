import type {
  EditScope,
  Flow,
  FlowKind,
  FlowRepeat,
} from "@lifeos/contracts";
import { supabase } from "@/lib/supabase";
import { dayBefore } from "@/modules/finance/lib/month";

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
  category: string | null;
  on_date: string;
  amount: number;
  recur: FlowRepeat;
  until_on: string | null;
  skips: string[];
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
    ...(row.category ? { category: row.category } : {}),
    on: row.on_date,
    amount: Number(row.amount),
    repeat: row.recur,
    ...(row.until_on ? { until: row.until_on } : {}),
    ...(row.skips?.length ? { skips: row.skips } : {}),
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
    category: value.category ?? null,
    on_date: value.on,
    amount: value.amount,
    recur: value.repeat,
    until_on: value.until ?? null,
    skips: value.skips ?? [],
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

export async function deleteOccurrence(
  flow: Flow,
  on: string,
  scope: EditScope,
): Promise<void> {
  if (scope === "all") return deleteFlow(flow.id);

  if (scope === "one") {
    return saveFlow({ ...flow, skips: [...(flow.skips ?? []), on] });
  }

  const until = dayBefore(on);
  if (until < flow.on) return deleteFlow(flow.id);
  return saveFlow({ ...flow, until });
}

export async function saveOccurrence(
  flow: Flow,
  on: string,
  next: Flow,
  scope: EditScope,
): Promise<void> {
  if (scope === "all") {
    const [, , day] = next.on.split("-");
    const [year, month] = flow.on.split("-");
    return saveFlow({
      ...next,
      id: flow.id,
      on: `${year}-${month}-${day}`,
      until: flow.until,
      skips: flow.skips,
      position: flow.position,
    });
  }

  const fresh = {
    ...next,
    id: crypto.randomUUID(),
    position: undefined,
    skips: undefined,
    until: undefined,
    ...(scope === "one" ? { repeat: "once" as FlowRepeat } : {}),
  };

  if (scope === "one") {
    await saveFlow({ ...flow, skips: [...(flow.skips ?? []), on] });
    return saveFlow(fresh);
  }

  const until = dayBefore(on);
  if (until < flow.on) await deleteFlow(flow.id);
  else await saveFlow({ ...flow, until });
  return saveFlow(fresh);
}

export async function deleteFlow(id: string): Promise<void> {
  await ensureLoaded();
  lastError = null;
  cache = cache.filter((one) => one.id !== id);
  emit();
  await guard(supabase.from("flows").delete().eq("id", id));
}
