"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { EditScope, Flow } from "@lifeos/contracts";
import { move } from "@/components/reorder";
import {
  ensureEvents,
  eventsServer,
  eventsSnapshot,
  shiftsIn,
  subscribeEvents,
} from "@/lib/shifts";
import {
  currentUserId,
  deleteFlow,
  deleteOccurrence,
  ensureLoaded,
  getServerSnapshot,
  getSnapshot,
  lastWriteError,
  reorderFlows,
  saveFlow,
  saveOccurrence,
  subscribe,
} from "@/modules/finance/lib/flow-store";
import {
  inMonth,
  newestFirst,
  pending,
  settled,
  thisMonth,
  total,
  type Month,
} from "@/modules/finance/lib/month";
import { MonthBar } from "@/modules/finance/components/month-bar";
import { SplitChart } from "@/modules/finance/components/split-chart";
import { ComingUp } from "@/modules/finance/components/coming-up";
import { FlowPanel } from "@/modules/finance/components/flow-panel";

export function FinanceView({ today = new Date() }: { today?: Date }) {
  const flows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const events = useSyncExternalStore(
    subscribeEvents,
    eventsSnapshot,
    eventsServer,
  );
  const [month, setMonth] = useState<Month>(() => thisMonth(today));

  useEffect(() => {
    void ensureLoaded();
    void ensureEvents();
  }, []);

  const userId = currentUserId() ?? "";
  const shown = inMonth(flows, month);
  const income = newestFirst([
    ...shown.filter((one) => one.flow.kind === "income"),
    ...shiftsIn(events, month),
  ]);
  const spending = shown.filter((one) => one.flow.kind === "expense");
  const gone = newestFirst(settled(spending, today));
  const due = pending(spending, today);

  function onMove(rows: typeof income) {
    return (from: number, to: number) => {
      const ids = move(
        rows.map((one) => one.flow.id),
        from,
        to,
      );
      void reorderFlows(
        ids.filter((id) => rows.some((one) => one.flow.id === id && !one.flow.eventId)),
      );
    };
  }

  function onSave(
    flow: Flow,
    on: string,
    next: Flow,
    scope: EditScope | null,
  ): void {
    if (scope) void saveOccurrence(flow, on, next, scope);
    else void saveFlow({ ...next, id: flow.id, position: flow.position });
  }

  function onRemove(flow: Flow, on: string, scope: EditScope | null): void {
    if (scope) void deleteOccurrence(flow, on, scope);
    else void deleteFlow(flow.id);
  }

  return (
    <div className="grid gap-5">
      {lastWriteError() ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-muted">
          Could not save: {lastWriteError()}
        </p>
      ) : null}

      <MonthBar month={month} onChange={setMonth} today={today} />

      <SplitChart income={total(income)} expense={total(gone)} />

      <ComingUp rows={due} today={today} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <FlowPanel
          kind="income"
          rows={income}
          userId={userId}
          month={month}
          onAdd={(flow: Flow) => void saveFlow(flow)}
          onSave={onSave}
          onRemove={onRemove}
          onMove={onMove(income)}
        />
        <FlowPanel
          kind="expense"
          rows={gone}
          userId={userId}
          month={month}
          onAdd={(flow: Flow) => void saveFlow(flow)}
          onSave={onSave}
          onRemove={onRemove}
          onMove={onMove(gone)}
        />
      </div>
    </div>
  );
}
