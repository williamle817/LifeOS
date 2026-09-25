"use client";

import { useState } from "react";
import type { GradeItem } from "@lifeos/contracts";
import type { CourseGrade } from "@/modules/academic/lib/grade";

const input =
  "rounded-lg border border-line bg-surface px-2 py-1 text-[13px] outline-none focus:border-accent";

function scoreText(item: GradeItem): string {
  return item.score === null ? "" : String(item.score);
}

export function GradeTable({
  grade,
  userId,
  courseId,
  onScore,
  onAdd,
  onRemove,
}: {
  grade: CourseGrade;
  userId: string;
  courseId: string;
  onScore: (id: string, score: number | null) => void;
  onAdd: (item: GradeItem) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueOn, setDueOn] = useState("");

  function submit(categoryId: string) {
    if (!title.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      userId,
      courseId,
      categoryId,
      title: title.trim(),
      score: null,
      maxScore: Number(maxScore) || 100,
      ...(dueOn ? { dueOn } : {}),
    });
    setTitle("");
    setMaxScore("100");
    setDueOn("");
  }

  return (
    <div className="grid gap-4">
      {grade.categories.map((entry) => {
        const category = entry.category;
        const rows = [...entry.kept, ...entry.dropped, ...entry.pending];
        const dropped = new Set(entry.dropped.map((item) => item.id));

        return (
          <section
            key={category.id}
            aria-label={category.name}
            className="rounded-xl border border-line bg-surface"
          >
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3">
              <h3 className="text-sm font-medium">{category.name}</h3>
              <span className="text-xs text-ink-muted">
                {category.weight}%
              </span>
              {category.extraCredit ? (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                  extra credit
                </span>
              ) : null}
              {category.dropLowest ? (
                <span className="text-[11px] text-ink-faint">
                  drops {category.dropLowest} lowest
                </span>
              ) : null}
              <span className="ml-auto text-[13px]">
                {entry.pct === null ? (
                  <span className="text-ink-faint">nothing marked yet</span>
                ) : (
                  <span className="font-medium">{entry.pct}%</span>
                )}
              </span>
            </header>

            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-ink-faint">
                  <th className="px-4 py-1.5 font-normal">Item</th>
                  <th className="px-4 py-1.5 font-normal">Due</th>
                  <th className="px-4 py-1.5 text-right font-normal">Score</th>
                  <th className="px-4 py-1.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-4 py-1.5">
                      {item.title}
                      {dropped.has(item.id) ? (
                        <span className="ml-2 text-[11px] text-ink-faint">
                          dropped
                        </span>
                      ) : null}
                      {item.eventId ? (
                        <span className="ml-2 text-[11px] text-ink-faint">
                          from Schedule
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-1.5 text-ink-faint">
                      {item.dueOn ?? ""}
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <input
                        aria-label={`${item.title} score`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="pending"
                        value={scoreText(item)}
                        onChange={(e) =>
                          onScore(
                            item.id,
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                        className={`w-20 text-right ${input}`}
                      />
                      <span className="ml-1 text-ink-faint">
                        / {item.maxScore}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => onRemove(item.id)}
                        className="rounded-lg px-2 py-0.5 text-ink-faint hover:bg-surface-muted hover:text-ink"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-line px-4 py-2">
              {adding === category.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Item name"
                    autoFocus
                    value={title}
                    placeholder="HW 3"
                    onChange={(e) => setTitle(e.target.value)}
                    className={input}
                  />
                  <input
                    aria-label="Out of"
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className={`w-20 ${input}`}
                  />
                  <input
                    aria-label="Due date"
                    type="date"
                    value={dueOn}
                    onChange={(e) => setDueOn(e.target.value)}
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={() => submit(category.id)}
                    className="rounded-lg bg-accent px-3 py-1 text-[13px] font-medium text-surface"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(null)}
                    className="rounded-lg px-2 py-1 text-[13px] text-ink-muted hover:bg-surface-muted"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(category.id)}
                  className="text-[13px] text-ink-muted hover:text-ink"
                >
                  Add item to {category.name}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
