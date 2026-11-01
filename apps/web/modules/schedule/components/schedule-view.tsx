"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
  duplicateOccurrence,
  removeOccurrence,
  saveOccurrence,
  undo,
  subscribe,
} from "@/modules/schedule/lib/event-store";
import { EventForm } from "@/modules/schedule/components/event-form";
import { EventDetails } from "@/modules/schedule/components/event-details";
import { SaveError } from "@/components/save-error";
import { ScopeAsk } from "@/components/scope-ask";

const FORM_W = 300;
const DETAIL_W = 320;
const MAX_HEIGHT = 420;
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
  intent?: "move" | "duplicate";
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

function clock(at: Date): string {
  return at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const calendar = useRef<FullCalendar>(null);

  const events = useMemo(
    () => (range ? expand(rows, range.from, range.to) : []),
    [rows, range],
  );

  useEffect(() => {
    void ensureLoaded();
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(width < 48rem)").matches) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    calendar.current?.getApi().changeView("timeGridThreeDay", yesterday);
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

  function onDates(arg: { start: Date; end: Date }) {
    setRange({ from: arg.start, to: arg.end });
  }

  function applyDrag(info: EventDropArg | EventResizeDoneArg) {
    const { allDay, start, end, startStr, endStr } = info.event;
    const found = events.find((event) => event.id === info.event.id);
    if (!found || !start || !end) {
      info.revert();
      return;
    }
    const moved = {
      ...found,
      allDay,
      start: allDay ? startStr : start.toISOString(),
      end: allDay ? endStr : end.toISOString(),
    } as LifeEvent;

    if (found.seriesId && found.occurrenceDate) {
      setPopover({
        ...place(info.el.getBoundingClientRect(), FORM_W),
        editing: moved,
        mode: "scope",
        intent: "move",
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
  const pending = popover?.range;

  const blocks = useMemo(() => {
    const out: EventInput[] = events.map((event) => {
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
    if (pending) {
      out.push({
        id: "pending",
        title: "",
        start: pending.start,
        end: pending.end,
        allDay: pending.allDay,
        ...paint("blue"),
      });
    }
    return out;
  }, [events, preview, pending]);

  return (
    <>
      <SaveError message={lastWriteError()} className="mx-5 mt-3" />

      <div
        data-page="schedule"
        className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-panel bg-surface shadow-soft"
      >
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          ref={calendar}
          initialView="timeGridWeek"
          views={{
            timeGridThreeDay: {
              type: "timeGrid",
              duration: { days: 3 },
              buttonText: "3 Days",
            },
          }}
          headerToolbar={{
            left: "title prev next today",
            right: "newEvent timeGridDay,timeGridThreeDay,timeGridWeek,dayGridMonth",
          }}
          titleFormat={{ month: "long", year: "numeric" }}
          customButtons={{
            newEvent: {
              text: "New event",
              click: (_click, element) => {
                const rect = element.getBoundingClientRect();
                const start = new Date();
                start.setHours(start.getHours() + 1, 0, 0, 0);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                setPopover({
                  ...place(new DOMRect(rect.right, rect.bottom + GAP, 0, 0), FORM_W),
                  editing: null,
                  mode: "edit",
                  range: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                    allDay: false,
                  },
                });
              },
            },
          }}
          height="100%"
          scrollTime="08:00:00"
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
          slotEventOverlap={false}
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
            const weekday = arg.date.toLocaleDateString("en-US", {
              weekday: "short",
            });

            if (arg.view.type === "dayGridMonth") {
              return (
                <span className="text-xs font-medium text-ink-faint">
                  {weekday}
                </span>
              );
            }

            return (
              <span className="flex flex-col items-center gap-1 py-1.5">
                <span
                  className={`text-xs leading-none ${
                    arg.isToday ? "font-semibold text-accent" : "text-ink-faint"
                  }`}
                >
                  {weekday}
                </span>
                <span
                  className={`grid size-9 place-items-center rounded-full text-[15px] font-semibold ${
                    arg.isToday ? "bg-accent text-surface" : "text-ink-muted"
                  }`}
                >
                  {arg.date.getDate()}
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
                  className="truncate px-1 text-[11px] font-semibold"
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
                  <span className="font-semibold">{title}</span>
                </div>
              );
            }

            const span =
              arg.event.start && arg.event.end
                ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000
                : 60;

            if (span < 45) {
              const tiny = span < 30;
              return (
                <div className="flex h-full items-center overflow-hidden px-1">
                  <span className="truncate leading-none">
                    <span
                      style={ink}
                      className={`font-semibold ${
                        tiny ? "text-[10px]" : "text-[12px]"
                      }`}
                    >
                      {title}
                    </span>
                    {arg.event.start ? (
                      <span
                        style={inkMuted}
                        className={`ml-1.5 ${
                          tiny ? "text-[9px]" : "text-[10px]"
                        }`}
                      >
                        {clock(arg.event.start)}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            }

            return (
              <div className="overflow-hidden px-1 py-0.5 leading-tight">
                <div
                  style={ink}
                  className="truncate text-[13px] font-semibold"
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
            className="fixed z-30 overflow-y-auto rounded-[1.5rem] border border-line/60 bg-surface shadow-pop"
          >
            {popover.mode === "scope" && popover.editing ? (
              <ScopeAsk
                onPick={(scope) => {
                  const target = popover.editing!;
                  if (popover.intent === "duplicate")
                    void duplicateOccurrence(target, scope);
                  else void saveOccurrence(target, scope);
                  setPopover(null);
                }}
                onCancel={close}
              />
            ) : popover.mode === "details" && popover.editing ? (
              <EventDetails
                event={popover.editing}
                onEdit={() => setPopover({ ...popover, mode: "edit" })}
                onDuplicate={() => {
                  const target = popover.editing!;
                  if (target.seriesId && target.occurrenceDate)
                    setPopover({
                      ...popover,
                      mode: "scope",
                      intent: "duplicate",
                    });
                  else {
                    void duplicateOccurrence(target, "one");
                    setPopover(null);
                  }
                }}
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
