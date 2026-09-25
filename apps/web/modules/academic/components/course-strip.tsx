"use client";

import type { Course } from "@lifeos/contracts";
import type { CourseGrade } from "@/modules/academic/lib/grade";

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

        return (
          <button
            key={course.id}
            type="button"
            onClick={() => onSelect(course.id)}
            aria-pressed={active}
            className={`min-w-44 rounded-xl border p-3 text-left transition-colors ${
              active
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:bg-surface-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                style={{ backgroundColor: `var(--event-${color})` }}
                className="size-2.5 shrink-0 rounded-full"
              />
              <span className="text-xs text-ink-muted">
                {course.code || course.title}
              </span>
            </span>

            <span className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-medium">
                {grade?.currentGrade === null || grade === undefined
                  ? "--"
                  : `${grade.currentGrade}%`}
              </span>
              <span className="text-sm text-ink-muted">
                {grade?.letter ?? ""}
              </span>
            </span>

            <span className="mt-0.5 block text-[11px] text-ink-faint">
              {grade ? `${grade.banked} of 100 banked` : "no grading set up"}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onNew}
        className="min-w-32 rounded-xl border border-dashed border-line px-3 py-3 text-left text-[13px] text-ink-muted hover:bg-surface-muted"
      >
        New course
      </button>
    </div>
  );
}
