"use client";

import { useState } from "react";
import {
  DEFAULT_SCALE,
  EVENT_COLORS,
  LETTERS,
  type Category,
  type Course,
  type EventColor,
  type Letter,
  type ScaleStep,
} from "@lifeos/contracts";
import { extraTotal, weightTotal } from "@/modules/academic/lib/grade";

type Draft = {
  title: string;
  code: string;
  color: EventColor;
  scale: ScaleStep[];
  categories: Category[];
};

function blank(userId: string, courseId: string): Category {
  return {
    id: crypto.randomUUID(),
    userId,
    courseId,
    name: "",
    weight: 0,
    dropLowest: 0,
    extraCredit: false,
    position: 0,
  };
}

function starter(userId: string, courseId: string): Category[] {
  return [
    { ...blank(userId, courseId), name: "Exams", weight: 40, position: 0 },
    { ...blank(userId, courseId), name: "Homework", weight: 30, position: 1 },
    { ...blank(userId, courseId), name: "Quizzes", weight: 30, position: 2 },
  ];
}

const input =
  "rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-accent";

export function CourseForm({
  course,
  categories,
  userId,
  semesterId,
  onSave,
  onDelete,
  onCancel,
}: {
  course: Course | null;
  categories: Category[];
  userId: string;
  semesterId: string;
  onSave: (course: Course, categories: Category[]) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [id] = useState(() => course?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<Draft>(() => ({
    title: course?.title ?? "",
    code: course?.code ?? "",
    color: course?.color ?? "blue",
    scale: course?.scale ?? DEFAULT_SCALE,
    categories: course ? categories : starter(userId, id),
  }));

  const set = (patch: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const named = draft.categories.filter((category) => category.name.trim());
  const required = weightTotal(named);
  const extra = extraTotal(named);
  const balanced = required === 100;

  function editCategory(index: number, patch: Partial<Category>) {
    set({
      categories: draft.categories.map((category, i) =>
        i === index ? { ...category, ...patch } : category,
      ),
    });
  }

  function editScale(letter: Letter, min: number) {
    set({
      scale: draft.scale.map((step) =>
        step.letter === letter ? { ...step, min } : step,
      ),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!balanced) return;
        onSave(
          {
            id,
            userId,
            semesterId,
            title: draft.title,
            ...(draft.code ? { code: draft.code } : {}),
            color: draft.color,
            scale: draft.scale,
          },
          named.map((category, index) => ({
            ...category,
            courseId: id,
            position: index,
          })),
        );
      }}
      className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
    >
      <h2 className="text-sm font-medium">
        {course ? "Edit course" : "New course"}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-ink-muted">Course name</span>
          <input
            required
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            className={`mt-1 w-full ${input}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Code</span>
          <input
            value={draft.code}
            onChange={(e) => set({ code: e.target.value })}
            className={`mt-1 w-full ${input}`}
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="text-xs text-ink-muted">Colour</span>
        <div className="mt-1 flex gap-2">
          {EVENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => set({ color })}
              aria-label={color}
              aria-pressed={draft.color === color}
              style={{
                backgroundColor: `var(--event-${color})`,
                borderColor:
                  draft.color === color
                    ? `var(--event-${color}-ink)`
                    : `var(--event-${color}-line)`,
              }}
              className={`size-6 rounded-full transition-all ${
                draft.color === color ? "border-2" : "border"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-muted">How it is graded</span>
          <span
            className={`text-xs ${balanced ? "text-ink-faint" : "text-accent"}`}
          >
            {required} of 100
            {extra ? ` plus ${extra} extra credit` : ""}
          </span>
        </div>

        <div className="mt-2 grid gap-2">
          {draft.categories.map((category, index) => (
            <div
              key={category.id}
              className="grid grid-cols-[1fr_4.5rem_4.5rem_auto_auto] items-center gap-2"
            >
              <input
                aria-label={`Category ${index + 1} name`}
                value={category.name}
                placeholder="Homework"
                onChange={(e) => editCategory(index, { name: e.target.value })}
                className={input}
              />
              <input
                aria-label={`Category ${index + 1} weight`}
                type="number"
                min="0"
                step="0.5"
                value={category.weight}
                onChange={(e) =>
                  editCategory(index, { weight: Number(e.target.value) || 0 })
                }
                className={input}
              />
              <input
                aria-label={`Category ${index + 1} drop lowest`}
                type="number"
                min="0"
                step="1"
                value={category.dropLowest}
                onChange={(e) =>
                  editCategory(index, {
                    dropLowest: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className={input}
              />
              <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <input
                  type="checkbox"
                  aria-label={`Category ${index + 1} extra credit`}
                  checked={category.extraCredit}
                  onChange={(e) =>
                    editCategory(index, { extraCredit: e.target.checked })
                  }
                />
                extra
              </label>
              <button
                type="button"
                aria-label={`Remove category ${index + 1}`}
                onClick={() =>
                  set({
                    categories: draft.categories.filter((_, i) => i !== index),
                  })
                }
                className="rounded-lg px-2 py-1 text-[13px] text-ink-faint hover:bg-surface-muted hover:text-ink"
              >
                x
              </button>
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-[1fr_4.5rem_4.5rem_auto_auto] gap-2 text-[11px] text-ink-faint">
          <span>name</span>
          <span>weight</span>
          <span>drop</span>
          <span />
          <span />
        </div>

        <button
          type="button"
          onClick={() =>
            set({ categories: [...draft.categories, blank(userId, id)] })
          }
          className="mt-2 rounded-full border border-line px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
        >
          Add category
        </button>
      </div>

      <div className="mt-5">
        <span className="text-xs text-ink-muted">Letter cutoffs</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {LETTERS.filter((letter) => letter !== "F").map((letter) => (
            <label key={letter} className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium">{letter}</span>
              <input
                aria-label={`${letter} cutoff`}
                type="number"
                min="0"
                max="100"
                value={
                  draft.scale.find((step) => step.letter === letter)?.min ?? 0
                }
                onChange={(e) => editScale(letter, Number(e.target.value) || 0)}
                className={`w-[4.5rem] ${input}`}
              />
            </label>
          ))}
        </div>
      </div>

      {balanced ? null : (
        <p className="mt-4 text-[13px] text-accent">
          The categories that are not extra credit have to add up to 100.
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="submit"
          disabled={!balanced}
          className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
        >
          Cancel
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
          >
            Delete course
          </button>
        ) : null}
      </div>
    </form>
  );
}
