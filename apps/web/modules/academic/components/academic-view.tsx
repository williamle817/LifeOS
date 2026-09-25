"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Category, Course, GradeItem } from "@lifeos/contracts";
import {
  addSemester,
  currentUserId,
  deleteCourse,
  deleteItem,
  deleteSemester,
  ensureLoaded,
  getServerSnapshot,
  getSnapshot,
  lastWriteError,
  saveCourse,
  saveItem,
  setScore,
  subscribe,
} from "@/modules/academic/lib/course-store";
import {
  getServerSnapshot as selectionServer,
  getSnapshot as selectionSnapshot,
  resolve,
  select,
  subscribe as selectionSubscribe,
} from "@/modules/academic/lib/selection";
import { gradeCourse } from "@/modules/academic/lib/grade";
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
    void saveCourse(saved, categories);
    select({ courseId: saved.id });
    setEditing(null);
  }

  return (
    <div className="grid gap-5">
      {lastWriteError() ? (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-muted">
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
          void deleteSemester(id);
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
                  void deleteCourse(course.id);
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
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-sm font-medium">
                {course.code ? `${course.code}, ` : ""}
                {course.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditing("edit")}
                className="rounded-lg px-2 py-1 text-[13px] text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                Edit
              </button>
            </div>

            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-muted">Current grade</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-medium">
                    {grade.currentGrade === null
                      ? "--"
                      : `${grade.currentGrade}%`}
                  </span>
                  <span className="text-base text-ink-muted">
                    {grade.letter ?? ""}
                  </span>
                </dd>
                <dd className="text-[11px] text-ink-faint">
                  out of the work marked so far
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Banked</dt>
                <dd className="mt-0.5 text-2xl font-medium">
                  {grade.banked}
                </dd>
                <dd className="text-[11px] text-ink-faint">
                  points of the whole course, out of 100
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Still ahead</dt>
                <dd className="mt-0.5 text-2xl font-medium">
                  {grade.remaining}
                </dd>
                <dd className="text-[11px] text-ink-faint">
                  points not marked yet
                </dd>
              </div>
            </dl>
          </div>

          {chances ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <ChanceChart chances={chances} />
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">
              Once one score is in, this is where the chance of each grade
              appears.
            </p>
          )}

          <GradeTable
            grade={grade}
            userId={userId}
            courseId={course.id}
            onScore={(id, score) => void setScore(id, score)}
            onAdd={(item: GradeItem) => void saveItem(item)}
            onRemove={(id) => void deleteItem(id)}
          />
        </div>
      ) : null}
    </div>
  );
}
