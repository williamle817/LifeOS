"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { EditScope, Flow } from "@lifeos/contracts";
import {
  ensureEvents,
  eventFor,
  eventsServer,
  eventsSnapshot,
  mealsIn,
  removeFromSchedule,
  saveFromSchedule,
  shiftsIn,
  subscribeEvents,
} from "@/lib/from-schedule";
import {
  currentUserId,
  deleteFlow,
  deleteOccurrence,
  ensureLoaded,
  getServerSnapshot,
  getSnapshot,
  lastWriteError,
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
  const spending = [
    ...shown.filter((one) => one.flow.kind === "expense"),
    ...mealsIn(events, month),
  ];
  const gone = newestFirst(settled(spending, today));
  const due = pending(spending, today);

  function onSave(
    flow: Flow,
    on: string,
    next: Flow,
    scope: EditScope | null,
  ): void {
    if (flow.eventId) {
      const event = eventFor(events, month, flow.id);
      if (event) {
        void saveFromSchedule(
          event,
          { title: next.title, place: next.place, amount: next.amount },
          scope ?? "one",
        );
      }
      return;
    }
    if (scope) void saveOccurrence(flow, on, next, scope);
    else void saveFlow({ ...next, id: flow.id, position: flow.position });
  }

  function onRemove(flow: Flow, on: string, scope: EditScope | null): void {
    if (flow.eventId) {
      const event = eventFor(events, month, flow.id);
      if (event) void removeFromSchedule(event, scope ?? "one");
      return;
    }
    if (scope) void deleteOccurrence(flow, on, scope);
    else void deleteFlow(flow.id);
  }

  return (
    <div data-page="finance" className="grid gap-5">
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
        />
        <FlowPanel
          kind="expense"
          rows={gone}
          userId={userId}
          month={month}
          onAdd={(flow: Flow) => void saveFlow(flow)}
          onSave={onSave}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
