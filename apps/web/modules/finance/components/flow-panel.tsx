"use client";

import { useState } from "react";
import type { Flow, FlowKind, FlowRepeat } from "@lifeos/contracts";
import { FLOW_REPEATS } from "@lifeos/contracts";
import { ActionIcon } from "@/components/icons";
import { DragHandle, useDragList } from "@/components/reorder";
import {
  dayLabel,
  money,
  total,
  type Dated,
  type Month,
} from "@/modules/finance/lib/month";

const input =
  "rounded-xl border border-line bg-surface px-2.5 py-1 text-[13px] outline-none transition-colors focus:border-accent";

const REPEAT_LABEL: Record<FlowRepeat, string> = {
  once: "One off",
  monthly: "Every month",
  yearly: "Every year",
};

function firstOf(month: Month): string {
  const mm = String(month.month + 1).padStart(2, "0");
  return `${month.year}-${mm}-01`;
}

export function FlowPanel({
  kind,
  rows,
  userId,
  month,
  onSave,
  onRemove,
  onMove,
}: {
  kind: FlowKind;
  rows: Dated[];
  userId: string;
  month: Month;
  onSave: (flow: Flow) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const list = `flow-${kind}`;
  const drag = useDragList((_list, from, to) => onMove(from, to));

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [on, setOn] = useState(() => firstOf(month));
  const [amount, setAmount] = useState("");
  const [repeat, setRepeat] = useState<FlowRepeat>("once");

  const heading = kind === "income" ? "Income" : "Expenses";
  const tint = kind === "income" ? "green" : "red";
  const sum = total(rows);

  function reset(startOn: string) {
    setTitle("");
    setPlace("");
    setOn(startOn);
    setAmount("");
    setRepeat("once");
  }

  function startAdd() {
    setEditing(null);
    setAdding(true);
    reset(firstOf(month));
  }

  function startEdit(flow: Flow) {
    setAdding(false);
    setEditing(flow.id);
    setTitle(flow.title);
    setPlace(flow.place ?? "");
    setOn(flow.on);
    setAmount(String(flow.amount));
    setRepeat(flow.repeat);
  }

  function build(over: Partial<Flow>): Flow {
    return {
      id: crypto.randomUUID(),
      userId,
      kind,
      title: title.trim(),
      ...(place.trim() ? { place: place.trim() } : { place: undefined }),
      on,
      amount: Number(amount) || 0,
      repeat,
      ...over,
    };
  }

  function submitNew() {
    if (!title.trim()) return;
    onSave(build({}));
    reset(on);
  }

  function submitEdit(flow: Flow) {
    if (!title.trim()) return;
    onSave(build({ id: flow.id, userId: flow.userId, position: flow.position }));
    setEditing(null);
  }

  function field(caption: string, control: React.ReactNode) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-faint">{caption}</span>
        {control}
      </label>
    );
  }

  function fields() {
    return (
      <>
        {field(
          "Name",
          <input
            aria-label={`${heading} name`}
            autoFocus
            value={title}
            placeholder={kind === "income" ? "Working shift" : "Groceries"}
            onChange={(e) => setTitle(e.target.value)}
            className={`min-w-32 ${input}`}
          />,
        )}
        {field(
          "Location",
          <input
            aria-label={`${heading} location`}
            value={place}
            placeholder="optional"
            onChange={(e) => setPlace(e.target.value)}
            className={`min-w-28 ${input}`}
          />,
        )}
        {field(
          "Date",
          <input
            aria-label={`${heading} date`}
            type="date"
            value={on}
            onChange={(e) => setOn(e.target.value)}
            className={input}
          />,
        )}
        {field(
          "Amount",
          <input
            aria-label={`${heading} amount`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            placeholder="0.00"
            onChange={(e) => setAmount(e.target.value)}
            className={`w-24 text-right ${input}`}
          />,
        )}
        {field(
          "Repeats",
          <select
            aria-label={`${heading} repeats`}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as FlowRepeat)}
            className={input}
          >
            {FLOW_REPEATS.map((one) => (
              <option key={one} value={one}>
                {REPEAT_LABEL[one]}
              </option>
            ))}
          </select>,
        )}
      </>
    );
  }

  return (
    <section
      aria-label={heading}
      className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-md"
    >
      <header className="flex items-center gap-2 border-b border-line bg-accent-soft px-4 py-2.5">
        <h3 className="text-sm font-medium">{heading}</h3>
        <span
          style={{ color: `var(--event-${tint}-ink)` }}
          className="ml-auto text-sm font-semibold"
        >
          {money(sum)}
        </span>
      </header>

      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map(({ flow, on: when }, seat) =>
            editing === flow.id ? (
              <li key={flow.id} className="bg-surface-muted px-4 py-3">
                <p className="text-[11px] text-ink-faint">
                  Editing{" "}
                  <span className="font-medium text-ink">{flow.title}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {fields()}
                  <button
                    type="button"
                    onClick={() => submitEdit(flow)}
                    className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={flow.id}
                data-drag={list}
                style={drag.style(list, seat)}
                className="flex items-center gap-2 bg-surface px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{flow.title}</span>
                  <span className="text-[11px] text-ink-faint">
                    {[
                      dayLabel(when),
                      flow.place,
                      flow.repeat === "once" ? null : REPEAT_LABEL[flow.repeat],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                <span
                  style={{ color: `var(--event-${tint}-ink)` }}
                  className="shrink-0 font-medium"
                >
                  {kind === "income" ? "+" : "-"}
                  {money(flow.amount)}
                </span>

                <button
                  type="button"
                  aria-label={`Edit ${flow.title}`}
                  onClick={() => startEdit(flow)}
                  className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <ActionIcon name="edit" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${flow.title}`}
                  onClick={() => onRemove(flow.id)}
                  className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <ActionIcon name="trash" />
                </button>
                <DragHandle
                  list={list}
                  index={seat}
                  drag={drag}
                  label={flow.title}
                />
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="px-4 py-5 text-[13px] text-ink-muted">
          Nothing in {heading.toLowerCase()} this month.
        </p>
      )}

      <div className="border-t border-line bg-surface-muted px-4 py-3">
        {adding ? (
          <div>
            <p className="text-[11px] text-ink-faint">
              New entry in{" "}
              <span className="font-medium text-ink">{heading}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              {fields()}
              <button
                type="button"
                onClick={submitNew}
                className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            Add {kind}
          </button>
        )}
      </div>
    </section>
  );
}
