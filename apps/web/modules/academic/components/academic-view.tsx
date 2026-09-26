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
  deleteItem,
  saveCategory,
  saveCourse,
  saveSemester,
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
import { gradeCourse, show } from "@/modules/academic/lib/grade";
import { SemesterBar } from "@/modules/academic/components/semester-bar";
import { CourseStrip } from "@/modules/academic/components/course-strip";
import { CourseForm } from "@/modules/academic/components/course-form";
import { GradeTable } from "@/modules/academic/components/grade-table";
import { Upcoming } from "@/modules/academic/components/upcoming";
import { LetterPill } from "@/modules/academic/components/letter-pill";

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
        onSave={(semester) => void saveSemester(semester)}
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
                  {grade.letter ? <LetterPill letter={grade.letter} /> : null}
                </dd>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Earned</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold">
                      {show(grade.banked)}
                    </span>
                    <span className="text-sm text-ink-faint">/ 100</span>
                  </span>
                  {grade.bankedLetter === "F" ? null : (
                    <LetterPill letter={grade.bankedLetter} />
                  )}
                </dd>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Maximum attainable</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {show(grade.ceiling)}%
                  </span>
                  {grade.ceilingLetter === "F" ? null : (
                    <LetterPill letter={grade.ceilingLetter} />
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <GradeTable
              grade={grade}
              userId={userId}
              courseId={course.id}
              onScore={(id, score) => void setScore(id, score)}
              onSave={(item: GradeItem) => void saveItem(item)}
              onRemove={(id) => void deleteItem(id)}
              onSaveCategory={(category) => void saveCategory(category)}
            />

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-24">
              <Upcoming
                items={data.items.filter(
                  (item) => item.courseId === course.id,
                )}
                categories={mine}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
