"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EventColor, LifeEvent } from "@lifeos/contracts";
import { expand } from "@/modules/schedule/lib/recurrence";
import FullCalendar from "@fullcalendar/react";
import type { EventDropArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import {
  currentUserId,
  getServerSnapshot,
  getSnapshot,
  canUndo,
  ensureLoaded,
  lastWriteError,
  removeOccurrence,
  saveOccurrence,
  undo,
  subscribe,
} from "@/modules/schedule/lib/event-store";
import { EventForm } from "@/modules/schedule/components/event-form";
import { EventDetails } from "@/modules/schedule/components/event-details";
import { ScopeAsk } from "@/modules/schedule/components/scope-ask";

const FORM_W = 272;
const DETAIL_W = 320;
const MAX_HEIGHT = 340;
const GAP = 8;

type Range = { start: string; end: string; allDay: boolean };

function paint(color: EventColor) {
  return {
    backgroundColor: `var(--event-${color})`,
    borderColor: `var(--event-${color}-line)`,
    extendedProps: { color },
  };
}

type Popover = {
  top: number;
  left: number;
  editing: LifeEvent | null;
  range?: Range;
  mode: "details" | "edit" | "scope";
  ask?: "delete";
  revert?: () => void;
};

function place(anchor: DOMRect, width: number): { top: number; left: number } {
  const left =
    anchor.right + GAP + width <= window.innerWidth
      ? anchor.right + GAP
      : Math.max(GAP, anchor.left - GAP - width);
  const top = Math.max(
    GAP,
    Math.min(anchor.top, window.innerHeight - MAX_HEIGHT - GAP),
  );
  return { top, left };
}

function pointRect(event: MouseEvent | null): DOMRect {
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 3;
  return new DOMRect(x, y, 0, 0);
}

export function ScheduleView() {
  const rows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [range, setRange] = useState<{ from: Date; to: Date } | null>(null);

  const events = range ? expand(rows, range.from, range.to) : [];

  useEffect(() => {
    void ensureLoaded();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "z" || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!canUndo()) return;
      e.preventDefault();
      void undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const settled = useRef(false);

  function onDates(arg: { start: Date; end: Date }) {
    setRange({ from: arg.start, to: arg.end });
    scrollToMorning();
  }

  function scrollToMorning() {
    if (settled.current) return;
    settled.current = true;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-time="08:00:00"]')
        ?.scrollIntoView({ block: "start" });
    });
  }

  function applyDrag(info: EventDropArg | EventResizeDoneArg) {
    const found = events.find((event) => event.id === info.event.id);
    if (!found || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    const moved = {
      ...found,
      start: info.event.start.toISOString(),
      end: info.event.end.toISOString(),
    } as LifeEvent;

    if (found.seriesId && found.occurrenceDate) {
      setPopover({
        ...place(info.el.getBoundingClientRect(), FORM_W),
        editing: moved,
        mode: "scope",
        revert: info.revert,
      });
      return;
    }
    void saveOccurrence(moved, "one");
  }

  function close() {
    popover?.revert?.();
    setPopover(null);
  }

  const preview = popover?.mode === "scope" ? popover.editing : null;

  const blocks: EventInput[] = events.map((event) => {
    const shown = preview && preview.id === event.id ? preview : event;
    return {
      id: shown.id,
      title: shown.title,
      start: shown.start,
      end: shown.end,
      allDay: shown.allDay ?? false,
      ...paint(shown.color ?? "blue"),
    };
  });

  if (popover?.range) {
    blocks.push({
      id: "pending",
      title: "",
      start: popover.range.start,
      end: popover.range.end,
      allDay: popover.range.allDay,
      ...paint("blue"),
    });
  }

  return (
    <>
      {lastWriteError() ? (
        <p className="mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-muted">
          Could not save: {lastWriteError()}
        </p>
      ) : null}

      <div className="rounded-xl border border-line bg-surface p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          height="auto"
          stickyHeaderDates
          datesSet={onDates}
          firstDay={1}
          allDayText="All day"
          eventDisplay="block"
          buttonText={{
            today: "Today",
            day: "Day",
            week: "Week",
            month: "Month",
          }}
          nowIndicator
          snapDuration="00:15:00"
          editable
          selectable
          selectMirror
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            omitZeroMinute: true,
            hour12: true,
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }}
          dayHeaderContent={(arg) => {
            const weekday = arg.date
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase();

            if (arg.view.type === "dayGridMonth") {
              return (
                <span className="text-[11px] tracking-wide text-ink-faint">
                  {weekday}
                </span>
              );
            }

            return (
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] leading-none tracking-wide text-ink-faint">
                  {weekday}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[13px] leading-tight ${
                    arg.isToday
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-transparent text-ink-muted"
                  }`}
                >
                  {arg.date.getMonth() + 1}/{arg.date.getDate()}
                </span>
              </span>
            );
          }}
          events={blocks}
          eventContent={(arg) => {
            const title = arg.event.title || "(Title)";
            const color = (arg.event.extendedProps.color ??
              "blue") as EventColor;
            const ink = { color: `var(--event-${color}-ink)` };
            const inkMuted = { color: `var(--event-${color}-ink-muted)` };

            if (arg.event.allDay) {
              return (
                <div
                  style={ink}
                  className="truncate px-1 text-[11px] font-medium"
                >
                  {title}
                </div>
              );
            }

            if (arg.view.type === "dayGridMonth") {
              return (
                <div style={ink} className="truncate px-1 text-[11px]">
                  {arg.timeText ? (
                    <span style={inkMuted}>{arg.timeText} </span>
                  ) : null}
                  <span className="font-medium">{title}</span>
                </div>
              );
            }

            return (
              <div className="overflow-hidden px-1 py-0.5 leading-tight">
                <div
                  style={ink}
                  className="truncate text-[13px] font-medium"
                >
                  {title}
                </div>
                {arg.timeText ? (
                  <div style={inkMuted} className="truncate text-[10px]">
                    {arg.timeText}
                  </div>
                ) : null}
              </div>
            );
          }}
          eventClick={(info) => {
            const found = events.find((event) => event.id === info.event.id);
            if (!found) return;
            setPopover({
              ...place(info.el.getBoundingClientRect(), DETAIL_W),
              editing: found,
              mode: "details",
            });
          }}
          select={(info) => {
            info.view.calendar.unselect();
            setPopover({
              ...place(pointRect(info.jsEvent), FORM_W),
              editing: null,
              mode: "edit",
              range: {
                start: info.startStr,
                end: info.endStr,
                allDay: info.allDay,
              },
            });
          }}
          eventDrop={applyDrag}
          eventResize={applyDrag}
        />
      </div>

      {popover ? (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              top: popover.top,
              left: popover.left,
              maxHeight: MAX_HEIGHT,
              width: popover.mode === "details" ? DETAIL_W : FORM_W,
            }}
            className="fixed z-30 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg"
          >
            {popover.mode === "scope" && popover.editing ? (
              <ScopeAsk
                title="Change repeating event"
                onPick={(scope) => {
                  void saveOccurrence(popover.editing!, scope);
                  setPopover(null);
                }}
                onCancel={close}
              />
            ) : popover.mode === "details" && popover.editing ? (
              <EventDetails
                event={popover.editing}
                onEdit={() => setPopover({ ...popover, mode: "edit" })}
                onDelete={() => {
                  const target = popover.editing!;
                  if (target.seriesId && target.occurrenceDate)
                    setPopover({ ...popover, mode: "edit", ask: "delete" });
                  else {
                    void removeOccurrence(target, "one");
                    setPopover(null);
                  }
                }}
                onClose={() => setPopover(null)}
              />
            ) : (
            <EventForm
              editing={popover.editing}
              initialRange={popover.range}
              userId={currentUserId() ?? ""}
              onSave={(event, scope) => {
                void saveOccurrence(event, scope);
                setPopover(null);
              }}
              onDelete={(event, scope) => {
                void removeOccurrence(event, scope);
                setPopover(null);
              }}
              onCancel={() => setPopover(null)}
              initialAsk={popover.ask}
            />
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
