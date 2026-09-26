"use client";

import type { Course } from "@lifeos/contracts";
import { show, type CourseGrade } from "@/modules/academic/lib/grade";
import { LetterPill } from "@/modules/academic/components/letter-pill";

export function CourseStrip({
  courses,
  grades,
  selected,
  onSelect,
  onNew,
}: {
  courses: Course[];
  grades: Map<string, CourseGrade>;
  selected: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {courses.map((course) => {
        const grade = grades.get(course.id);
        const active = course.id === selected;
        const color = course.color ?? "blue";
        const banked = grade?.banked ?? 0;

        return (
          <button
            key={course.id}
            type="button"
            onClick={() => onSelect(course.id)}
            aria-pressed={active}
            style={
              active
                ? {
                    backgroundColor: `var(--event-${color})`,
                    borderColor: `var(--event-${color}-line)`,
                    color: `var(--event-${color}-ink)`,
                  }
                : undefined
            }
            className={`relative min-w-52 overflow-hidden rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              active
                ? "shadow-md"
                : "border-line bg-surface shadow-sm hover:bg-surface-muted"
            }`}
          >
            <span
              style={{ backgroundColor: `var(--event-${color})` }}
              className="absolute inset-x-0 top-0 h-1.5"
            />

            <span
              className={`block text-xs font-medium ${
                active ? "" : "text-ink-muted"
              }`}
              style={
                active ? { color: `var(--event-${color}-ink-muted)` } : undefined
              }
            >
              {course.code || course.title}
            </span>

            <span className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[1.75rem] leading-none font-semibold">
                {grade?.currentGrade == null ? "--" : show(grade.currentGrade)}
                <span className="text-base font-medium">
                  {grade?.currentGrade == null ? "" : "%"}
                </span>
              </span>
              {grade?.letter ? <LetterPill letter={grade.letter} /> : null}
            </span>

            <span
              className="mt-3 block h-1.5 w-full overflow-hidden rounded-full"
              style={{
                backgroundColor: active
                  ? "var(--surface)"
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
              className={`mt-1.5 block text-[11px] ${
                active ? "" : "text-ink-faint"
              }`}
              style={
                active ? { color: `var(--event-${color}-ink-muted)` } : undefined
              }
            >
              {grade ? `${show(banked)} of 100 earned` : "no grading set up"}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onNew}
        className="min-w-36 rounded-3xl border border-dashed border-line px-4 py-4 text-left text-[13px] text-ink-muted transition-colors hover:border-accent hover:bg-surface-muted hover:text-ink"
      >
        New course
      </button>
    </div>
  );
}
