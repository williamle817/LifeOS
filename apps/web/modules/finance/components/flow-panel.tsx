"use client";

import { useState } from "react";
import type { EditScope, Flow, FlowKind, FlowRepeat } from "@lifeos/contracts";
import { EXPENSE_TYPES, FLOW_REPEATS, INCOME_TYPES } from "@lifeos/contracts";
import { ActionIcon, NavIcon } from "@/components/icons";
import { Labeled } from "@/components/labeled";
import {
  inputSmall as input,
  primary,
  quiet,
  quietOnMuted,
} from "@/components/styles";
import { Modal } from "@/components/modal";
import { ScopeAsk } from "@/components/scope-ask";
import { shortDate } from "@/lib/dates";
import {
  dayOf,
  money,
  total,
  type Dated,
  type Month,
} from "@/modules/finance/lib/month";

const REPEAT_LABEL: Record<FlowRepeat, string> = {
  once: "One off",
  monthly: "Every month",
  yearly: "Every year",
};

const SHOWN = 10;

type Asking = { flow: Flow; on: string; next: Flow | null };

function repeats(row: Dated): boolean {
  return row.series ?? row.flow.repeat !== "once";
}

export function FlowPanel({
  kind,
  rows,
  userId,
  month,
  onAdd,
  onSave,
  onRemove,
  switcher,
}: {
  kind: FlowKind;
  rows: Dated[];
  userId: string;
  month: Month;
  onAdd: (flow: Flow) => void;
  onSave: (flow: Flow, on: string, next: Flow, scope: EditScope | null) => void;
  onRemove: (flow: Flow, on: string, scope: EditScope | null) => void;
  switcher?: React.ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [on, setOn] = useState(() => dayOf(month, 1));
  const [amount, setAmount] = useState("");
  const [repeat, setRepeat] = useState<FlowRepeat>("once");
  const [all, setAll] = useState(false);

  const heading = kind === "income" ? "Income" : "Expenses";
  const ink = kind === "income" ? "var(--money-in)" : "var(--money-out)";
  const types = kind === "income" ? INCOME_TYPES : EXPENSE_TYPES;
  const sum = total(rows);
  const shown = all ? rows : rows.slice(0, SHOWN);

  function reset(startOn: string) {
    setTitle("");
    setPlace("");
    setCategory("");
    setOn(startOn);
    setAmount("");
    setRepeat("once");
  }

  function startAdd() {
    setEditing(null);
    setAdding(true);
    reset(dayOf(month, 1));
  }

  function startEdit(flow: Flow, when: string) {
    setAdding(false);
    setEditing(flow.id);
    setTitle(flow.title);
    setPlace(flow.place ?? "");
    setCategory(flow.category ?? "");
    setOn(when);
    setAmount(String(flow.amount));
    setRepeat(flow.repeat);
  }

  function build(over: Partial<Flow> = {}): Flow {
    return {
      id: crypto.randomUUID(),
      userId,
      kind,
      title: title.trim(),
      ...(place.trim() ? { place: place.trim() } : { place: undefined }),
      ...(category ? { category } : { category: undefined }),
      on,
      amount: Math.max(0, Number(amount) || 0),
      repeat,
      ...over,
    };
  }

  function submitNew() {
    if (!title.trim()) return;
    onAdd(build());
    reset(on);
  }

  function submitEdit(row: Dated) {
    if (!title.trim()) return;
    const next = build({ userId: row.flow.userId });
    setEditing(null);
    if (repeats(row)) setAsking({ flow: row.flow, on: row.on, next });
    else onSave(row.flow, row.on, next, null);
  }

  function remove(row: Dated) {
    if (repeats(row)) setAsking({ flow: row.flow, on: row.on, next: null });
    else onRemove(row.flow, row.on, null);
  }

  function fields(from?: "work" | "dining") {
    return (
      <>
        <Labeled caption="Name">
          <input
            aria-label={`${heading} name`}
            autoFocus
            value={title}
            placeholder={kind === "income" ? "Working shift" : "Groceries"}
            onChange={(e) => setTitle(e.target.value)}
            className={`min-w-32 ${input}`}
          />
        </Labeled>
        <Labeled caption="Location">
          <input
            aria-label={`${heading} location`}
            value={place}
            placeholder="optional"
            onChange={(e) => setPlace(e.target.value)}
            className={`min-w-28 ${input}`}
          />
        </Labeled>
        {from ? null : (
          <>
            <Labeled caption="Type">
              <select
                aria-label={`${heading} type`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={input}
              >
                <option value="">Not set</option>
                {types.map((one) => (
                  <option key={one} value={one}>
                    {one}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled caption="Date">
              <input
                aria-label={`${heading} date`}
                type="date"
                value={on}
                onChange={(e) => setOn(e.target.value)}
                className={input}
              />
            </Labeled>
          </>
        )}
        {from === "work" ? null : (
          <Labeled caption="Amount">
            <input
              aria-label={`${heading} amount`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
              className={`w-24 text-right ${input}`}
            />
          </Labeled>
        )}
        {from ? null : (
          <Labeled caption="Repeats">
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
            </select>
          </Labeled>
        )}
      </>
    );
  }

  return (
    <section
      aria-label={heading}
      className="overflow-hidden rounded-panel bg-surface shadow-soft"
    >
      <header className="flex flex-wrap items-center gap-2.5 bg-surface-muted px-5 py-4">
        {switcher ?? (
          <>
            <span
              aria-hidden="true"
              style={{
                backgroundColor: `var(--event-${
                  kind === "income" ? "green" : "red"
                }-line)`,
              }}
              className="size-2.5 shrink-0 rounded-full"
            />
            <h3 className="font-display text-2xl font-medium">{heading}</h3>
          </>
        )}
        <span
          style={{ color: ink }}
          className="ml-auto text-base font-bold tabular-nums"
        >
          {money(sum)}
        </span>
      </header>

      {rows.length ? (
        <ul className="divide-y divide-surface-muted">
          {shown.map((row) => {
            const { flow, on: when } = row;
            return editing === flow.id ? (
              <li key={flow.id} className="bg-canvas px-5 py-4">
                <p className="text-xs text-ink-faint">
                  Editing{" "}
                  <span className="font-medium text-ink">{flow.title}</span>
                  {row.from
                    ? `, the ${row.from === "work" ? "shift" : "meal"} itself changes in Schedule`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {fields(row.from)}
                  <button
                    type="button"
                    onClick={() => submitEdit(row)}
                    className={primary}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className={quietOnMuted}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={flow.id}
                className="flex items-center gap-2 bg-surface py-3 pr-3 pl-5 text-sm transition-colors hover:bg-canvas"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{flow.title}</span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-faint [&_svg]:size-3.5">
                    {[shortDate(when), flow.category, flow.place]
                      .filter(Boolean)
                      .join(" · ")}
                    {flow.eventId ? (
                      <span title="From Schedule" className="inline-flex">
                        <NavIcon name="schedule" />
                        <span className="sr-only">from Schedule</span>
                      </span>
                    ) : null}
                    {flow.repeat === "once" ? null : (
                      <span title={REPEAT_LABEL[flow.repeat]} className="inline-flex">
                        <ActionIcon name="repeat" />
                        <span className="sr-only">
                          {REPEAT_LABEL[flow.repeat]}
                        </span>
                      </span>
                    )}
                  </span>
                </span>

                <span
                  style={{ color: ink }}
                  className="shrink-0 font-bold tabular-nums"
                >
                  {kind === "income" ? "+" : "-"}
                  {money(flow.amount)}
                </span>

                <button
                  type="button"
                  aria-label={`Edit ${flow.title}`}
                  onClick={() => startEdit(flow, when)}
                  className="grid size-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <ActionIcon name="edit" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${flow.title}`}
                  onClick={() => remove(row)}
                  className="grid size-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <ActionIcon name="trash" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-muted">
          Nothing in {heading.toLowerCase()} this month.
        </p>
      )}

      {rows.length > SHOWN ? (
        <div className="flex justify-center border-t border-surface-muted p-2">
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll(!all)}
            className={quiet}
          >
            {all ? "Show less" : `View ${rows.length - SHOWN} more`}
          </button>
        </div>
      ) : null}

      <div className="bg-surface-muted px-5 py-4">
        {adding ? (
          <div>
            <p className="text-xs text-ink-faint">
              New entry in{" "}
              <span className="font-medium text-ink">{heading}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              {fields()}
              <button
                type="button"
                onClick={submitNew}
                className={primary}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className={quietOnMuted}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdd}
            className="flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line-strong bg-surface px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            Add {kind}
          </button>
        )}
      </div>

      {asking ? (
        <Modal label="Apply to" onClose={() => setAsking(null)}>
          <ScopeAsk
            noun="entry"
            plural="entries"
            onPick={(scope) => {
              if (asking.next)
                onSave(asking.flow, asking.on, asking.next, scope);
              else onRemove(asking.flow, asking.on, scope);
              setAsking(null);
            }}
            onCancel={() => setAsking(null)}
          />
        </Modal>
      ) : null}
    </section>
  );
}
