"use client";

import type { LifeEvent } from "@lifeos/contracts";
import { ActionIcon } from "@/components/icons";

function dateLabel(event: LifeEvent): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const from = new Date(
    event.allDay ? `${event.start.slice(0, 10)}T00:00:00` : event.start,
  );
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

export function EventDetails({
  event,
  onEdit,
  onDelete,
  onClose,
}: {
  event: LifeEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const color = event.color ?? "blue";

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <span
          style={{ backgroundColor: `var(--event-${color})` }}
          className="mt-1 size-3 shrink-0 rounded-full"
        />
        <h2 className="flex-1 text-sm font-medium break-words">
          {event.title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <ActionIcon name="edit" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <ActionIcon name="trash" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <ActionIcon name="close" />
          </button>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-ink-faint">Date</dt>
        <dd>{dateLabel(event)}</dd>
        <dt className="text-ink-faint">Time</dt>
        <dd>{timeLabel(event)}</dd>
        {event.notes ? (
          <>
            <dt className="text-ink-faint">Notes</dt>
            <dd className="break-words">{event.notes}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
