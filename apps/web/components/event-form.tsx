"use client";

import { useState } from "react";
import {
  EVENT_COLORS,
  EVENT_TYPES,
  EDIT_SCOPES,
  RECUR_FREQS,
  type EditScope,
  type EventColor,
  type EventType,
  type LifeEvent,
  type RecurFreq,
} from "@lifeos/contracts";

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
  score: string;
  maxScore: string;
};

const EMPTY: Draft = {
  type: "general",
  title: "",
  color: "blue",
  freq: "none",
  interval: "1",
  until: "",
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
  score: "",
  maxScore: "",
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
      return { ...base, course: event.course };
    case "exam":
      return {
        ...base,
        course: event.course,
        score: event.score?.toString() ?? "",
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
      return { ...base, type: "class", course: draft.course };
    case "exam":
      return {
        ...base,
        type: "exam",
        course: draft.course,
        maxScore: Number(draft.maxScore),
        ...(draft.score ? { score: Number(draft.score) } : {}),
      };
  }
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={step}
        min={min}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
      />
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
}: {
  editing: LifeEvent | null;
  initialRange?: { start: string; end: string; allDay: boolean };
  userId: string;
  onSave: (event: LifeEvent, scope: EditScope) => void;
  onDelete: (event: LifeEvent, scope: EditScope) => void;
  onCancel: () => void;
  initialAsk?: "delete";
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
        return (
          <Field
            label="Course"
            required
            value={draft.course}
            onChange={(v) => set({ course: v })}
          />
        );
      case "exam":
        return (
          <>
            <Field
              label="Course"
              required
              value={draft.course}
              onChange={(v) => set({ course: v })}
            />
            <Field
              label="Score"
              type="number"
              step="0.01"
              value={draft.score}
              onChange={(v) => set({ score: v })}
            />
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

  if (asking) {
    return (
      <div className="p-3">
        <h2 className="text-sm font-medium">
          {asking === "delete" ? "Delete repeating event" : "Save changes to"}
        </h2>
        <div className="mt-3 grid gap-2">
          {EDIT_SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => apply(s)}
              className="rounded-lg border border-line px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-muted"
            >
              {s === "one"
                ? "This event"
                : s === "following"
                  ? "This and following events"
                  : "All events"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAsking(null)}
          className="mt-3 rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
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

        <label className="block">
          <span className="text-xs text-ink-muted">Repeat</span>
          <select
            value={draft.freq}
            onChange={(e) =>
              set({ freq: e.target.value as RecurFreq | "none" })
            }
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            <option value="none">Does not repeat</option>
            {RECUR_FREQS.map((f) => (
              <option key={f} value={f}>
                {f === "daily" ? "Daily" : f === "weekly" ? "Weekly" : "Monthly"}
              </option>
            ))}
          </select>
        </label>

        {draft.freq === "none" ? null : (
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
