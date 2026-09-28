"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Flow } from "@lifeos/contracts";
import { move } from "@/components/reorder";
import {
  currentUserId,
  deleteFlow,
  ensureLoaded,
  getServerSnapshot,
  getSnapshot,
  lastWriteError,
  reorderFlows,
  saveFlow,
  subscribe,
} from "@/modules/finance/lib/flow-store";
import {
  inMonth,
  thisMonth,
  total,
  type Month,
} from "@/modules/finance/lib/month";
import { MonthBar } from "@/modules/finance/components/month-bar";
import { SplitChart } from "@/modules/finance/components/split-chart";
import { FlowPanel } from "@/modules/finance/components/flow-panel";

export function FinanceView({ today = new Date() }: { today?: Date }) {
  const flows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [month, setMonth] = useState<Month>(() => thisMonth(today));

  useEffect(() => {
    void ensureLoaded();
  }, []);

  const userId = currentUserId() ?? "";
  const shown = inMonth(flows, month);
  const income = shown.filter((one) => one.flow.kind === "income");
  const expense = shown.filter((one) => one.flow.kind === "expense");

  function onMove(kind: "income" | "expense") {
    return (from: number, to: number) => {
      const rows = kind === "income" ? income : expense;
      const ids = move(
        rows.map((one) => one.flow.id),
        from,
        to,
      );
      void reorderFlows(ids);
    };
  }

  return (
    <div className="grid gap-5">
      {lastWriteError() ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-muted">
          Could not save: {lastWriteError()}
        </p>
      ) : null}

      <MonthBar month={month} onChange={setMonth} today={today} />

      <SplitChart income={total(income)} expense={total(expense)} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <FlowPanel
          kind="income"
          rows={income}
          userId={userId}
          month={month}
          onSave={(flow: Flow) => void saveFlow(flow)}
          onRemove={(id) => void deleteFlow(id)}
          onMove={onMove("income")}
        />
        <FlowPanel
          kind="expense"
          rows={expense}
          userId={userId}
          month={month}
          onSave={(flow: Flow) => void saveFlow(flow)}
          onRemove={(id) => void deleteFlow(id)}
          onMove={onMove("expense")}
        />
      </div>
    </div>
  );
}
