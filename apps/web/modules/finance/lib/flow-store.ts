import type {
  EditScope,
  Flow,
  FlowKind,
  FlowRepeat,
} from "@lifeos/contracts";
import { shiftDay } from "@/lib/dates";
import { createStore, currentUserId, owner } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { dayOf } from "@/modules/finance/lib/month";

export { currentUserId };

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
  position: number | null;
};

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
    position: value.position ?? 0,
  };
}

const NONE: Flow[] = [];

const store = createStore(NONE, async () => {
  const { data } = await supabase.from("flows").select("*");
  return ((data ?? []) as FlowRow[]).map(toFlow);
});

export const {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  lastWriteError,
  ensureLoaded,
} = store;

export async function saveFlow(flow: Flow): Promise<void> {
  await store.begin();
  const flows = getSnapshot();
  const exists = flows.some((one) => one.id === flow.id);
  const saved = {
    ...flow,
    userId: owner(flow.userId),
    position:
      flow.position ??
      (exists ? 0 : flows.filter((one) => one.kind === flow.kind).length),
  };

  store.set(
    exists
      ? flows.map((one) => (one.id === saved.id ? saved : one))
      : [...flows, saved],
  );
  await store.write(
    exists
      ? supabase.from("flows").update(flowRow(saved)).eq("id", saved.id)
      : supabase.from("flows").insert(flowRow(saved)),
  );
}

export async function deleteFlow(id: string): Promise<void> {
  await store.begin();
  store.set(getSnapshot().filter((one) => one.id !== id));
  await store.write(supabase.from("flows").delete().eq("id", id));
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
  const until = shiftDay(on, -1);
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
    const [year, month] = flow.on.split("-").map(Number);
    return saveFlow({
      ...next,
      id: flow.id,
      on: dayOf({ year, month: month - 1 }, Number(next.on.split("-")[2])),
      until: flow.until,
      skips: flow.skips,
      position: flow.position,
    });
  }

  await deleteOccurrence(flow, on, scope);
  await saveFlow({
    ...next,
    id: crypto.randomUUID(),
    position: undefined,
    skips: undefined,
    until: undefined,
    ...(scope === "one" ? { repeat: "once" as FlowRepeat } : {}),
  });
}
