"use client";

import { Fragment } from "react";
import type { LifeEvent } from "@lifeos/contracts";
import { ActionIcon } from "@/components/icons";
import { parseDay } from "@/lib/dates";

function dateLabel(event: LifeEvent): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const from = event.allDay
    ? parseDay(event.start.slice(0, 10))
    : new Date(event.start);
  return from.toLocaleDateString("en-US", opts);
}

function timeLabel(event: LifeEvent): string {
  if (event.allDay) return "All day";
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const from = new Date(event.start).toLocaleTimeString("en-US", opts);
  const to = new Date(event.end).toLocaleTimeString("en-US", opts);
  return `${from} - ${to}`;
}

function extras(event: LifeEvent): Array<[string, string]> {
  switch (event.type) {
    case "work":
      return event.place ? [["Workplace", event.place]] : [];
    case "gym":
      return [
        ["Workout", event.workout],
        ...(event.calories === undefined
          ? []
          : ([["Calories", String(event.calories)]] as Array<[string, string]>)),
      ];
    case "dining":
      return [["Place", event.place]];
    case "class":
      return [["Course", event.course]];
    default:
      return [];
  }
}

export function EventDetails({
  event,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: {
  event: LifeEvent;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const color = event.color ?? "blue";

  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <span
          style={{ backgroundColor: `var(--event-${color}-line)` }}
          className="mt-2.5 size-3 shrink-0 rounded-full"
        />
        <h2 className="flex-1 font-display text-2xl leading-tight font-medium break-words">
          {event.title}
        </h2>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {(
          [
            ["Edit", "edit", onEdit],
            ["Duplicate", "copy", onDuplicate],
            ["Delete", "trash", onDelete],
            ["Close", "close", onClose],
          ] as const
        ).map(([label, icon, onClick]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`grid size-10 place-items-center rounded-full transition-colors ${
              label === "Close"
                ? "ml-auto text-ink-muted hover:bg-surface-muted hover:text-ink"
                : "bg-surface-muted text-ink hover:brightness-95"
            }`}
          >
            <ActionIcon name={icon} />
          </button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-[4rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-ink-faint">Date</dt>
        <dd>{dateLabel(event)}</dd>
        <dt className="text-ink-faint">Time</dt>
        <dd>{timeLabel(event)}</dd>
        {extras(event).map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-ink-faint">{label}</dt>
            <dd className="break-words">{value}</dd>
          </Fragment>
        ))}
        {event.notes ? (
          <>
            <dt className="text-ink-faint">Notes</dt>
            <dd className="break-words whitespace-pre-line">{event.notes}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
