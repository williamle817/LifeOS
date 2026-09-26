"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import {
  addSemester,
  currentUserId,
  deleteCourse,
  deleteSemester,
  ensureLoaded,
  getServerSnapshot,
  getSnapshot,
  lastWriteError,
  saveCategory,
  saveCourse,
  subscribe,
} from "@/modules/academic/lib/course-store";
import {
  getServerSnapshot as selectionServer,
  getSnapshot as selectionSnapshot,
  resolve,
  select,
  subscribe as selectionSubscribe,
} from "@/modules/academic/lib/selection";
import { gradeCourse, show } from "@/modules/academic/lib/grade";
import { itemRemoved, itemSaved, reconcile } from "@/lib/exam-link";
import { predict } from "@/modules/academic/lib/predict";
import { SemesterBar } from "@/modules/academic/components/semester-bar";
import { CourseStrip } from "@/modules/academic/components/course-strip";
import { CourseForm } from "@/modules/academic/components/course-form";
import { GradeTable } from "@/modules/academic/components/grade-table";
import { ChanceChart } from "@/modules/academic/components/chance-chart";

export function AcademicView() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selection = useSyncExternalStore(
    selectionSubscribe,
    selectionSnapshot,
    selectionServer,
  );
  const [editing, setEditing] = useState<"new" | "edit" | null>(null);

  useEffect(() => {
    void ensureLoaded();
  }, []);

  const { semesterId, courseId } = resolve(
    data.semesters,
    data.courses,
    selection,
  );

  const courses = data.courses.filter((c) => c.semesterId === semesterId);
  const course = courses.find((c) => c.id === courseId) ?? null;

  const grades = useMemo(() => {
    const out = new Map<string, ReturnType<typeof gradeCourse>>();
    for (const one of courses) {
      out.set(one.id, gradeCourse(one, data.categories, data.items));
    }
    return out;
  }, [courses, data.categories, data.items]);

  const grade = course ? grades.get(course.id) : undefined;

  const chances = useMemo(
    () => (course ? predict(course, data.categories, data.items) : null),
    [course, data.categories, data.items],
  );

  const userId = currentUserId() ?? "";
  const mine = course
    ? data.categories
        .filter((c) => c.courseId === course.id)
        .sort((a, b) => a.position - b.position)
    : [];

  function handleSave(saved: Course, categories: Category[]) {
    void saveCourse(saved, categories).then(reconcile);
    select({ courseId: saved.id });
    setEditing(null);
  }

  return (
    <div className="grid gap-5">
      {lastWriteError() ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-muted">
          Could not save: {lastWriteError()}
        </p>
      ) : null}

      <SemesterBar
        semesters={data.semesters}
        selected={semesterId}
        onSelect={(id) => {
          select({ semesterId: id, courseId: null });
          setEditing(null);
        }}
        onAdd={(name, startsOn) => {
          const id = crypto.randomUUID();
          void addSemester({ id, userId, name, startsOn });
          select({ semesterId: id, courseId: null });
        }}
        onDelete={(id) => {
          void deleteSemester(id).then(reconcile);
          select({ semesterId: null, courseId: null });
        }}
      />

      {semesterId ? (
        <CourseStrip
          courses={courses}
          grades={grades}
          selected={courseId}
          onSelect={(id) => {
            select({ courseId: id });
            setEditing(null);
          }}
          onNew={() => setEditing("new")}
        />
      ) : null}

      {editing && semesterId ? (
        <CourseForm
          course={editing === "edit" ? course : null}
          categories={editing === "edit" ? mine : []}
          userId={userId}
          semesterId={semesterId}
          onSave={handleSave}
          onDelete={
            editing === "edit" && course
              ? () => {
                  void deleteCourse(course.id).then(reconcile);
                  select({ courseId: null });
                  setEditing(null);
                }
              : undefined
          }
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {!editing && !semesterId ? (
        <p className="text-[13px] text-ink-muted">
          Add a semester to start. Courses live inside a semester, so each term
          keeps its own subjects.
        </p>
      ) : null}

      {!editing && semesterId && !course ? (
        <p className="text-[13px] text-ink-muted">
          No courses in this semester yet. Add one, say how it is graded, then
          type in the assignments from the syllabus.
        </p>
      ) : null}

      {!editing && course && grade ? (
        <div className="grid gap-5">
          <div className="rounded-3xl border border-line bg-gradient-to-br from-surface to-surface-muted p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                style={{
                  backgroundColor: `var(--event-${course.color ?? "blue"})`,
                }}
                className="size-3 rounded-full"
              />
              <h2 className="text-sm font-medium">
                {course.code ? `${course.code}, ` : ""}
                {course.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditing("edit")}
                className="rounded-full px-3 py-1 text-[13px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                Edit
              </button>
            </div>

            <dl className="mt-3 grid gap-2.5 sm:grid-cols-3">
              <div
                style={{
                  backgroundColor: `var(--event-${course.color ?? "blue"})`,
                  borderColor: `var(--event-${course.color ?? "blue"}-line)`,
                  color: `var(--event-${course.color ?? "blue"}-ink)`,
                }}
                className="rounded-xl border p-3"
              >
                <dt className="text-xs">Current grade</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {grade.currentGrade === null
                      ? "--"
                      : `${show(grade.currentGrade)}%`}
                  </span>
                  <span className="text-base font-medium">
                    {grade.letter ?? ""}
                  </span>
                </dd>
                <dd
                  style={{
                    color: `var(--event-${course.color ?? "blue"}-ink-muted)`,
                  }}
                  className="text-[11px]"
                >
                  out of the work marked so far
                </dd>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Earned</dt>
                <dd className="mt-0.5 text-2xl font-semibold">
                  {show(grade.banked)}
                </dd>
                <dd className="text-[11px] text-ink-faint">
                  points of the whole course, out of 100
                </dd>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Still ahead</dt>
                <dd className="mt-0.5 text-2xl font-semibold">
                  {show(grade.remaining)}
                </dd>
                <dd className="text-[11px] text-ink-faint">
                  points not marked yet
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <GradeTable
              grade={grade}
              userId={userId}
              courseId={course.id}
              onScore={(id, score) => {
                const found = data.items.find((one) => one.id === id);
                if (found) void itemSaved({ ...found, score });
              }}
              onSave={(item: GradeItem) => void itemSaved(item)}
              onRemove={(id) => void itemRemoved(id)}
              onSaveCategory={(category) => void saveCategory(category)}
            />

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-24">
              {chances ? (
                <ChanceChart chances={chances} />
              ) : (
                <p className="text-[13px] text-ink-muted">
                  Once one score is in, this is where the chance of each grade
                  appears.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
