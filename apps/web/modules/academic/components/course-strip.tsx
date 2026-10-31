"use client";

import type { Course } from "@lifeos/contracts";
import { show, type CourseGrade } from "@/modules/academic/lib/grade";
import { LetterPill } from "@/modules/academic/components/letter-pill";
import { DragHandle, useDragList } from "@/components/reorder";
import { tint } from "@/components/styles";

export function CourseStrip({
  courses,
  grades,
  selected,
  onSelect,
  onNew,
  onMove,
}: {
  courses: Course[];
  grades: Map<string, CourseGrade>;
  selected: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const drag = useDragList((_list, from, to) => onMove(from, to));
  return (
    <div className="flex flex-wrap items-stretch gap-4">
      {courses.map((course, index) => {
        const grade = grades.get(course.id);
        const active = course.id === selected;
        const color = course.color ?? "blue";
        const banked = grade?.banked ?? 0;

        return (
          <div
            key={course.id}
            data-drag="course"
            style={drag.style("course", index)}
            className="relative"
          >
          <DragHandle
            list="course"
            index={index}
            drag={drag}
            label={course.code || course.title}
            className="absolute top-3.5 right-3.5 z-10"
          />
          <button
            type="button"
            onClick={() => onSelect(course.id)}
            aria-pressed={active}
            style={active ? tint(color) : undefined}
            className={`relative flex w-64 flex-col gap-2.5 rounded-panel p-5 text-left transition hover:-translate-y-0.5 ${
              active ? "border shadow-soft" : "bg-surface shadow-soft"
            }`}
          >
            <span
              className={`flex items-center gap-2 pr-8 text-xs font-semibold ${
                active ? "" : "text-ink-muted"
              }`}
              style={
                active ? { color: `var(--event-${color}-ink-muted)` } : undefined
              }
            >
              {active ? null : (
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: `var(--event-${color}-line)` }}
                  className="size-2.5 shrink-0 rounded-full"
                />
              )}
              <span className="truncate">{course.code || course.title}</span>
            </span>
            {course.code ? (
              <span className="-mt-1.5 truncate text-sm font-medium">
                {course.title}
              </span>
            ) : null}

            <span className="flex items-baseline gap-2.5">
              <span className="font-display text-[2.75rem] leading-none font-medium tabular-nums">
                {grade?.currentGrade == null ? "--" : show(grade.currentGrade)}
                <span className="text-[1.375rem]">
                  {grade?.currentGrade == null ? "" : "%"}
                </span>
              </span>
              {grade?.letter ? <LetterPill letter={grade.letter} /> : null}
            </span>

            <span
              className="block h-1.5 w-full overflow-hidden rounded-full"
              style={{
                backgroundColor: active
                  ? `color-mix(in srgb, var(--event-${color}-line) 35%, transparent)`
                  : "var(--surface-muted)",
              }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, banked)}%`,
                  backgroundColor: `var(--event-${color}-line)`,
                }}
              />
            </span>

            <span
              className={`block text-xs ${active ? "" : "text-ink-faint"}`}
              style={
                active ? { color: `var(--event-${color}-ink-muted)` } : undefined
              }
            >
              {grade ? `${show(banked)} of 100 earned` : "no grading set up"}
            </span>
          </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNew}
        className="flex min-h-40 w-44 items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line-strong px-4 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        New course
      </button>
    </div>
  );
}
