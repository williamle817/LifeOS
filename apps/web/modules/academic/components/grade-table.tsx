"use client";

import { useState } from "react";
import type { Category, GradeItem } from "@lifeos/contracts";
import { ActionIcon } from "@/components/icons";
import type { CourseGrade } from "@/modules/academic/lib/grade";
import { DragHandle, useDragList } from "@/components/reorder";

const input =
  "rounded-xl border border-line bg-surface px-2.5 py-1 text-[13px] outline-none transition-colors focus:border-accent";

function scoreText(item: GradeItem): string {
  return item.score === null ? "" : String(item.score);
}

function dayLabel(value?: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function GradeTable({
  grade,
  userId,
  courseId,
  onScore,
  onSave,
  onRemove,
  onSaveCategory,
  onMoveCategory,
  onMoveItem,
}: {
  grade: CourseGrade;
  userId: string;
  courseId: string;
  onScore: (id: string, score: number | null) => void;
  onSave: (item: GradeItem) => void;
  onRemove: (id: string) => void;
  onSaveCategory: (category: Category) => void;
  onMoveCategory: (from: number, to: number) => void;
  onMoveItem: (categoryId: string, from: number, to: number) => void;
}) {
  const drag = useDragList((list, from, to) => {
    if (list === "category") onMoveCategory(from, to);
    else onMoveItem(list.replace("item-", ""), from, to);
  });

  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [heading, setHeading] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("0");
  const [drop, setDrop] = useState("0");
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueOn, setDueOn] = useState("");

  function reset() {
    setTitle("");
    setMaxScore("100");
    setDueOn("");
  }

  function startEdit(item: GradeItem) {
    setAdding(null);
    setEditing(item.id);
    setTitle(item.title);
    setMaxScore(String(item.maxScore));
    setDueOn(item.dueOn ?? "");
  }

  function startHeading(category: Category) {
    setHeading(category.id);
    setName(category.name);
    setWeight(String(category.weight));
    setDrop(String(category.dropLowest));
  }

  function submitHeading(category: Category) {
    if (!name.trim()) return;
    onSaveCategory({
      ...category,
      name: name.trim(),
      weight: Number(weight) || 0,
      dropLowest: Math.max(0, Number(drop) || 0),
    });
    setHeading(null);
  }

  function startAdd(categoryId: string) {
    setEditing(null);
    setAdding(categoryId);
    reset();
  }

  function submitNew(categoryId: string) {
    if (!title.trim()) return;
    onSave({
      id: crypto.randomUUID(),
      userId,
      courseId,
      categoryId,
      title: title.trim(),
      score: null,
      maxScore: Number(maxScore) || 100,
      ...(dueOn ? { dueOn } : {}),
    });
    reset();
  }

  function submitEdit(item: GradeItem) {
    if (!title.trim()) return;
    onSave({
      ...item,
      title: title.trim(),
      maxScore: Number(maxScore) || 100,
      ...(dueOn ? { dueOn } : { dueOn: undefined }),
    });
    setEditing(null);
    reset();
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
            aria-label="Item name"
            autoFocus
            value={title}
            placeholder="HW 3"
            onChange={(e) => setTitle(e.target.value)}
            className={`min-w-32 ${input}`}
          />,
        )}
        {field(
          "Out of",
          <input
            aria-label="Out of"
            type="number"
            min="0"
            step="0.01"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className={`w-20 ${input}`}
          />,
        )}
        {field(
          "Due",
          <input
            aria-label="Due date"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className={input}
          />,
        )}
      </>
    );
  }

  return (
    <div className="rounded-3xl border border-line-strong bg-surface p-4 shadow-md">
      <div className="grid gap-3">
      {grade.categories.map((entry, slot) => {
        const category = entry.category;
        const rows = [...entry.kept, ...entry.dropped, ...entry.pending].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );
        const dropped = new Set(entry.dropped.map((one) => one.id));

        return (
          <section
            key={category.id}
            data-drag="category"
            style={drag.style("category", slot)}
            aria-label={category.name}
            className="overflow-hidden rounded-2xl border border-line"
          >
            {heading === category.id ? (
              <header className="flex flex-wrap items-end gap-2 border-b border-line bg-accent-soft px-4 py-3">
                {field(
                  "Name",
                  <input
                    aria-label="Category name"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`min-w-32 ${input}`}
                  />,
                )}
                {field(
                  "Worth %",
                  <input
                    aria-label="Category weight"
                    type="number"
                    min="0"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={`w-20 ${input}`}
                  />,
                )}
                {field(
                  "Drop lowest",
                  <input
                    aria-label="Category drop lowest"
                    type="number"
                    min="0"
                    step="1"
                    value={drop}
                    onChange={(e) => setDrop(e.target.value)}
                    className={`w-20 ${input}`}
                  />,
                )}
                <button
                  type="button"
                  onClick={() => submitHeading(category)}
                  className="rounded-full bg-accent px-4 py-1 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setHeading(null)}
                  className="rounded-full px-3 py-1 text-[13px] text-ink-muted transition-colors hover:bg-surface"
                >
                  Cancel
                </button>
              </header>
            ) : (
              <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line bg-accent-soft px-4 py-2.5">
                <h3 className="text-sm font-medium">{category.name}</h3>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
                  {category.weight}%
                </span>
                {category.extraCredit ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                    extra credit
                  </span>
                ) : null}
                {category.dropLowest ? (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-faint">
                    drops {category.dropLowest} lowest
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => startHeading(category)}
                  className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
                >
                  <ActionIcon name="edit" />
                </button>
                <span className="ml-auto flex items-center gap-1 text-[13px]">
                  {entry.pct === null ? (
                    <span className="text-ink-muted">nothing marked yet</span>
                  ) : (
                    <span className="font-medium">{entry.pct}%</span>
                  )}
                  <DragHandle
                    list="category"
                    index={slot}
                    drag={drag}
                    label={category.name}
                  />
                </span>
              </header>
            )}

            <ul className="divide-y divide-line">
              {rows.map((item, seat) =>
                editing === item.id ? (
                  <li key={item.id} className="bg-surface-muted px-4 py-3">
                    <p className="text-[11px] text-ink-faint">
                      Editing <span className="font-medium text-ink">{item.title}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {fields()}
                      <button
                        type="button"
                        onClick={() => submitEdit(item)}
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
                    key={item.id}
                    data-drag={`item-${category.id}`}
                    style={drag.style(`item-${category.id}`, seat)}
                    className="flex items-center gap-2 bg-surface px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          dropped.has(item.id) ? "text-ink-faint line-through" : ""
                        }
                      >
                        {item.title}
                      </span>
                      <span className="ml-2 text-[11px] text-ink-faint">
                        {dayLabel(item.dueOn)}
                        {dropped.has(item.id) ? " dropped" : ""}
                        {item.eventId ? " from Schedule" : ""}
                      </span>
                    </span>

                    <input
                      aria-label={`${item.title} score`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="--"
                      value={scoreText(item)}
                      onChange={(e) =>
                        onScore(
                          item.id,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      className={`w-16 text-right ${input}`}
                    />
                    <span className="w-10 text-[11px] text-ink-faint">
                      / {item.maxScore}
                    </span>

                    <button
                      type="button"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => startEdit(item)}
                      className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <ActionIcon name="edit" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.title}`}
                      onClick={() => onRemove(item.id)}
                      className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <ActionIcon name="trash" />
                    </button>
                    <DragHandle
                      list={`item-${category.id}`}
                      index={seat}
                      drag={drag}
                      label={item.title}
                    />
                  </li>
                ),
              )}
            </ul>

            <div className="border-t border-line bg-surface-muted px-4 py-3">
              {adding === category.id ? (
                <div>
                  <p className="text-[11px] text-ink-faint">
                    New item in{" "}
                    <span className="font-medium text-ink">{category.name}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    {fields()}
                    <button
                      type="button"
                      onClick={() => submitNew(category.id)}
                      className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdding(null)}
                      className="rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startAdd(category.id)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    +
                  </span>
                  Add item to {category.name}
                </button>
              )}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
