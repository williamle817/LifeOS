"use client";

import { useState } from "react";
import {
  EVENT_COLORS,
  EVENT_TYPES,
  RECUR_FREQS,
  type Category,
  type Course,
  type EditScope,
  type EventColor,
  type EventType,
  type LifeEvent,
  type RecurFreq,
} from "@lifeos/contracts";
import { ScopeAsk } from "@/modules/schedule/components/scope-ask";

const TYPE_LABELS: Record<EventType, string> = {
  general: "General",
  work: "Work",
  gym: "Gym",
  dining: "Dining",
  class: "Class",
  exam: "Exam",
};

type Draft = {
  type: EventType;
  title: string;
  color: EventColor;
  freq: RecurFreq | "none";
  interval: string;
  until: string;
  byDay: number[];
  allDay: boolean;
  start: string;
  end: string;
  notes: string;
  tips: string;
  workout: string;
  calories: string;
  place: string;
  amount: string;
  course: string;
  courseId: string;
  categoryId: string;
  maxScore: string;
};

const EMPTY: Draft = {
  type: "general",
  title: "",
  color: "blue",
  freq: "none",
  interval: "1",
  until: "",
  byDay: [],
  allDay: false,
  start: "",
  end: "",
  notes: "",
  tips: "",
  workout: "",
  calories: "",
  place: "",
  amount: "",
  course: "",
  courseId: "",
  categoryId: "",
  maxScore: "100",
};

function toInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(input: string): string {
  return new Date(input).toISOString();
}

function toDate(value: string): string {
  return value.slice(0, 10);
}

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDraft(event: LifeEvent): Draft {
  const allDay = event.allDay ?? false;
  const base: Draft = {
    ...EMPTY,
    type: event.type,
    title: event.title,
    color: event.color ?? "blue",
    freq: event.recurrence?.freq ?? "none",
    interval: String(event.recurrence?.interval ?? 1),
    until: event.recurrence?.until ?? "",
    byDay: event.recurrence?.byDay ?? [],
    allDay,
    start: allDay ? toDate(event.start) : toInput(event.start),
    end: allDay ? shiftDay(toDate(event.end), -1) : toInput(event.end),
    notes: event.notes ?? "",
  };

  switch (event.type) {
    case "general":
      return base;
    case "work":
      return { ...base, tips: event.tips?.toString() ?? "" };
    case "gym":
      return {
        ...base,
        workout: event.workout,
        calories: event.calories?.toString() ?? "",
      };
    case "dining":
      return { ...base, place: event.place, amount: event.amount.toString() };
    case "class":
      return {
        ...base,
        course: event.course,
        courseId: event.courseId ?? "",
      };
    case "exam":
      return {
        ...base,
        course: event.course,
        courseId: event.courseId ?? "",
        categoryId: event.categoryId ?? "",
        maxScore: event.maxScore.toString(),
      };
  }
}

function toEvent(
  draft: Draft,
  id: string,
  userId: string,
  seriesId?: string,
  occurrenceDate?: string,
): LifeEvent {
  const repeats = draft.freq !== "none";
  const base = {
    id,
    userId,
    ...(occurrenceDate ? { occurrenceDate } : {}),
    ...(repeats
      ? {
          seriesId: seriesId ?? id,
          recurrence: {
            freq: draft.freq as RecurFreq,
            interval: Math.max(1, Number(draft.interval) || 1),
            ...(draft.byDay.length ? { byDay: draft.byDay } : {}),
            ...(draft.until ? { until: draft.until } : {}),
          },
        }
      : seriesId
        ? { seriesId }
        : {}),
    title: draft.title,
    start: draft.allDay ? draft.start : toIso(draft.start),
    end: draft.allDay ? shiftDay(draft.end, 1) : toIso(draft.end),
    ...(draft.allDay ? { allDay: true } : {}),
    ...(draft.color === "blue" ? {} : { color: draft.color }),
    ...(draft.notes ? { notes: draft.notes } : {}),
  };

  switch (draft.type) {
    case "general":
      return { ...base, type: "general" };
    case "work":
      return {
        ...base,
        type: "work",
        ...(draft.tips ? { tips: Number(draft.tips) } : {}),
      };
    case "gym":
      return {
        ...base,
        type: "gym",
        workout: draft.workout,
        ...(draft.calories ? { calories: Number(draft.calories) } : {}),
      };
    case "dining":
      return {
        ...base,
        type: "dining",
        place: draft.place,
        amount: Number(draft.amount),
      };
    case "class":
      return {
        ...base,
        type: "class",
        course: draft.course,
        ...(draft.courseId ? { courseId: draft.courseId } : {}),
      };
    case "exam":
      return {
        ...base,
        type: "exam",
        course: draft.course,
        maxScore: Number(draft.maxScore) || 100,
        ...(draft.courseId ? { courseId: draft.courseId } : {}),
        ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
      };
  }
}

const DAY_LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function summary(draft: Draft): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const picked = order
    .filter((d) => draft.byDay.includes(d))
    .map((d) => DAY_LETTERS[d]);
  const every =
    Number(draft.interval) > 1 ? `every ${draft.interval} weeks` : "weekly";
  const ends = draft.until ? `until ${draft.until}` : "forever";
  return `${picked.join(", ")} · ${every} · ${ends}`;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  step,
  min,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  multiline?: boolean;
}) {
  const shared =
    "mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent";
  return (
    <label className="block">
      <span className="text-xs text-ink-muted">{label}</span>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${shared} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          step={step}
          min={min}
          className={shared}
        />
      )}
    </label>
  );
}

export function EventForm({
  editing,
  initialRange,
  userId,
  onSave,
  onDelete,
  onCancel,
  initialAsk,
  courses = [],
  categories = [],
}: {
  editing: LifeEvent | null;
  initialRange?: { start: string; end: string; allDay: boolean };
  userId: string;
  onSave: (event: LifeEvent, scope: EditScope) => void;
  onDelete: (event: LifeEvent, scope: EditScope) => void;
  onCancel: () => void;
  initialAsk?: "delete";
  courses?: Course[];
  categories?: Category[];
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (editing) return toDraft(editing);
    if (!initialRange) return EMPTY;
    return {
      ...EMPTY,
      allDay: initialRange.allDay,
      start: initialRange.allDay
        ? toDate(initialRange.start)
        : toInput(initialRange.start),
      end: initialRange.allDay
        ? shiftDay(toDate(initialRange.end), -1)
        : toInput(initialRange.end),
    };
  });

  const [asking, setAsking] = useState<"save" | "delete" | null>(
    initialAsk ?? null,
  );
  const [custom, setCustom] = useState(false);
  const inSeries = Boolean(editing?.seriesId && editing.occurrenceDate);

  const set = (patch: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  function built(): LifeEvent {
    return toEvent(
      draft,
      editing?.id ?? crypto.randomUUID(),
      userId,
      editing?.seriesId,
      editing?.occurrenceDate,
    );
  }

  function apply(scope: EditScope) {
    if (asking === "delete" && editing) onDelete(editing, scope);
    else onSave(built(), scope);
  }

  const mine = categories.filter(
    (category) => category.courseId === draft.courseId,
  );

  function coursePicker() {
    return (
      <>
        <label className="block">
          <span className="text-xs text-ink-muted">Course</span>
          <select
            aria-label="Course"
            value={draft.courseId || "custom"}
            onChange={(e) => {
              const picked = courses.find((c) => c.id === e.target.value);
              set({
                courseId: picked ? picked.id : "",
                categoryId: "",
                course: picked ? picked.code || picked.title : draft.course,
              });
            }}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            {courses.map((one) => (
              <option key={one.id} value={one.id}>
                {one.code || one.title}
              </option>
            ))}
            <option value="custom">Type it in</option>
          </select>
        </label>
        {draft.courseId ? null : (
          <Field
            label="Course name"
            required
            value={draft.course}
            onChange={(v) => set({ course: v })}
          />
        )}
      </>
    );
  }

  function typeFields() {
    switch (draft.type) {
      case "general":
        return null;
      case "work":
        return (
          <Field
            label="Cash tips"
            type="number"
            step="0.01"
            value={draft.tips}
            onChange={(v) => set({ tips: v })}
          />
        );
      case "gym":
        return (
          <>
            <Field
              label="Workout"
              required
              value={draft.workout}
              onChange={(v) => set({ workout: v })}
            />
            <Field
              label="Calories"
              type="number"
              value={draft.calories}
              onChange={(v) => set({ calories: v })}
            />
          </>
        );
      case "dining":
        return (
          <>
            <Field
              label="Place"
              required
              value={draft.place}
              onChange={(v) => set({ place: v })}
            />
            <Field
              label="Amount"
              type="number"
              step="0.01"
              required
              value={draft.amount}
              onChange={(v) => set({ amount: v })}
            />
          </>
        );
      case "class":
        return coursePicker();
      case "exam":
        return (
          <>
            {coursePicker()}
            {draft.courseId && mine.length ? (
              <label className="block">
                <span className="text-xs text-ink-muted">Counts toward</span>
                <select
                  aria-label="Counts toward"
                  value={draft.categoryId}
                  onChange={(e) => set({ categoryId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
                >
                  <option value="">Nothing yet</option>
                  {mine.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Field
              label="Max score"
              type="number"
              step="0.01"
              required
              value={draft.maxScore}
              onChange={(v) => set({ maxScore: v })}
            />
          </>
        );
    }
  }

  if (custom) {
    const labels = [
      ["M", 1],
      ["T", 2],
      ["W", 3],
      ["T", 4],
      ["F", 5],
      ["S", 6],
      ["S", 0],
    ] as const;

    return (
      <div className="p-3">
        <h2 className="text-sm font-medium">Custom repeat</h2>

        <p className="mt-3 text-xs text-ink-muted">Repeat on</p>
        <div className="mt-1.5 flex gap-1">
          {labels.map(([text, day], i) => {
            const on = draft.byDay.includes(day);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set({
                    byDay: on
                      ? draft.byDay.filter((d) => d !== day)
                      : [...draft.byDay, day],
                  })
                }
                className={`size-7 rounded-full border text-[11px] transition-colors ${
                  on
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-line text-ink-muted hover:bg-surface-muted"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-ink-muted">Ends</p>
        <label className="mt-1.5 flex items-center gap-2 text-[13px]">
          <input
            type="radio"
            checked={!draft.until}
            onChange={() => set({ until: "" })}
          />
          Never
        </label>
        <label className="mt-1.5 flex items-center gap-2 text-[13px]">
          <input
            type="radio"
            checked={Boolean(draft.until)}
            onChange={() =>
              set({ until: draft.until || draft.start.slice(0, 10) })
            }
          />
          On
          <input
            type="date"
            value={draft.until}
            min={draft.start.slice(0, 10)}
            onChange={(e) => set({ until: e.target.value })}
            className="flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              set({ freq: draft.byDay.length ? "weekly" : "none" });
              setCustom(false);
            }}
            className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-surface"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => setCustom(false)}
            className="rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (asking) {
    return (
      <ScopeAsk
        title={asking === "delete" ? "Delete repeating event" : "Save changes to"}
        onPick={apply}
        onCancel={() => setAsking(null)}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (inSeries) {
          setAsking("save");
          return;
        }
        onSave(built(), "one");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="p-3"
    >
      <h2 className="text-sm font-medium">
        {editing ? "Edit event" : "New event"}
      </h2>

      <div className="mt-3 grid gap-2">
        <label className="block">
          <span className="text-xs text-ink-muted">Type</span>
          <select
            value={draft.type}
            onChange={(e) => set({ type: e.target.value as EventType })}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Title"
          required
          value={draft.title}
          onChange={(v) => set({ title: v })}
        />
        <Field
          label="Start"
          type={draft.allDay ? "date" : "datetime-local"}
          required
          value={draft.start}
          onChange={(v) => set({ start: v })}
        />
        <Field
          label="End"
          type={draft.allDay ? "date" : "datetime-local"}
          required
          min={draft.start}
          value={draft.end}
          onChange={(v) => set({ end: v })}
        />

        <div className="block">
          <span className="text-xs text-ink-muted">Color</span>
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

        {draft.type === "exam" ? null : (
        <label className="block">
          <span className="text-xs text-ink-muted">Repeat</span>
          <select
            value={draft.byDay.length ? "custom" : draft.freq}
            onChange={(e) => {
              if (e.target.value === "custom-open") {
                setCustom(true);
                return;
              }
              set({ freq: e.target.value as RecurFreq | "none", byDay: [] });
            }}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            <option value="none">Does not repeat</option>
            {RECUR_FREQS.map((f) => (
              <option key={f} value={f}>
                {f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
            {draft.byDay.length ? (
              <option value="custom">{summary(draft)}</option>
            ) : null}
            <option value="custom-open">Custom...</option>
          </select>
        </label>
        )}

        {draft.type === "exam" || draft.freq === "none" || draft.byDay.length ? null : (
          <>
            <Field
              label="Every"
              type="number"
              min="1"
              required
              value={draft.interval}
              onChange={(v) => set({ interval: v })}
            />
            <Field
              label="Until (blank = forever)"
              type="date"
              min={draft.start.slice(0, 10)}
              value={draft.until}
              onChange={(v) => set({ until: v })}
            />
          </>
        )}

        {typeFields()}

        <Field
          label="Notes"
          multiline
          value={draft.notes}
          onChange={(v) => set({ notes: v })}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-surface"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
        >
          Cancel
        </button>
        {editing ? (
          <button
            type="button"
            onClick={() =>
              inSeries ? setAsking("delete") : onDelete(editing, "one")
            }
            className="ml-auto rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
