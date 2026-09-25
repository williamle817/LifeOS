"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EventColor, LifeEvent } from "@lifeos/contracts";
import FullCalendar from "@fullcalendar/react";
import type { EventChangeArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  addEvent,
  currentUserId,
  deleteEvent,
  getServerSnapshot,
  getSnapshot,
  loadEvents,
  subscribe,
  updateEvent,
} from "@/lib/event-store";
import { EventForm } from "@/components/event-form";

const WIDTH = 272;
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
};

function place(anchor: DOMRect): { top: number; left: number } {
  const left =
    anchor.right + GAP + WIDTH <= window.innerWidth
      ? anchor.right + GAP
      : Math.max(GAP, anchor.left - GAP - WIDTH);
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
  const events = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [popover, setPopover] = useState<Popover | null>(null);

  useEffect(() => {
    void loadEvents();
  }, []);

  const settled = useRef(false);

  function scrollToMorning() {
    if (settled.current) return;
    settled.current = true;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-time="08:00:00"]')
        ?.scrollIntoView({ block: "start" });
    });
  }

  function applyDrag(info: EventChangeArg) {
    const found = events.find((event) => event.id === info.event.id);
    if (!found || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    void updateEvent({
      ...found,
      start: info.event.start.toISOString(),
      end: info.event.end.toISOString(),
    });
  }

  const blocks: EventInput[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay ?? false,
    ...paint(event.color ?? "blue"),
  }));

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
          datesSet={scrollToMorning}
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
              ...place(info.el.getBoundingClientRect()),
              editing: found,
            });
          }}
          select={(info) => {
            info.view.calendar.unselect();
            setPopover({
              ...place(pointRect(info.jsEvent)),
              editing: null,
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
            onClick={() => setPopover(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              top: popover.top,
              left: popover.left,
              maxHeight: MAX_HEIGHT,
            }}
            className="fixed z-30 w-[272px] overflow-y-auto rounded-xl border border-line bg-surface shadow-lg"
          >
            <EventForm
              editing={popover.editing}
              initialRange={popover.range}
              userId={currentUserId() ?? ""}
              onSave={(event) => {
                if (popover.editing) void updateEvent(event);
                else void addEvent(event);
                setPopover(null);
              }}
              onDelete={(id) => {
                void deleteEvent(id);
                setPopover(null);
              }}
              onCancel={() => setPopover(null)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
