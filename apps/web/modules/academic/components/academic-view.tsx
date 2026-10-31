"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
  reorderCategories,
  reorderCourses,
  reorderItems,
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
import { GradeTrack } from "@/modules/academic/components/grade-track";
import { move } from "@/components/reorder";
import { SaveError } from "@/components/save-error";
import { soft, tint } from "@/components/styles";

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

  const courses = data.courses
    .filter((c) => c.semesterId === semesterId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const course = courses.find((c) => c.id === courseId) ?? null;

  const grades = new Map(
    courses.map((one) => [
      one.id,
      gradeCourse(one, data.categories, data.items),
    ]),
  );

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
    <div data-page="academic" className="mx-auto grid w-full max-w-6xl gap-6">
      <SaveError message={lastWriteError()} />

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
          onMove={(from, to) =>
            void reorderCourses(move(courses.map((c) => c.id), from, to))
          }
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
        <p className="text-[15px] text-ink-muted">
          Add a semester to start. Courses live inside a semester, so each term
          keeps its own subjects.
        </p>
      ) : null}

      {!editing && semesterId && !course ? (
        <p className="text-[15px] text-ink-muted">
          No courses in this semester yet. Add one, say how it is graded, then
          type in the assignments from the syllabus.
        </p>
      ) : null}

      {!editing && course && grade ? (
        <div className="grid gap-6">
          <section
            aria-labelledby="course-title"
            className="flex flex-col gap-7 rounded-panel bg-surface p-6 shadow-soft sm:p-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
                  <span
                    style={{
                      backgroundColor: `var(--event-${course.color ?? "blue"}-line)`,
                    }}
                    className="size-3 rounded-full"
                  />
                  {course.code}
                </span>
                <h2
                  id="course-title"
                  className="font-display text-4xl leading-tight font-medium tracking-tight break-words"
                >
                  {course.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing("edit")}
                className={soft}
              >
                Edit
              </button>
            </div>

            <GradeTrack
              course={course}
              banked={grade.banked}
              ceiling={grade.ceiling}
            />

            <dl className="grid gap-3.5 sm:grid-cols-3">
              <div
                style={tint(course.color ?? "blue")}
                className="rounded-card border p-5"
              >
                <dt className="text-[13px] font-medium">Current grade</dt>
                <dd className="mt-2 flex items-baseline gap-2.5">
                  <span className="font-display text-5xl leading-none font-medium tabular-nums">
                    {grade.currentGrade === null
                      ? "--"
                      : `${show(grade.currentGrade)}%`}
                  </span>
                  {grade.letter ? <LetterPill letter={grade.letter} /> : null}
                </dd>
              </div>

              <div className="rounded-card bg-canvas p-5">
                <dt className="text-[13px] font-medium text-ink-muted">Earned</dt>
                <dd className="mt-2 flex items-baseline gap-2.5">
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-5xl leading-none font-medium tabular-nums">
                      {show(grade.banked)}
                    </span>
                    <span className="text-[15px] text-ink-faint">/ 100</span>
                  </span>
                  {grade.bankedLetter === "F" ? null : (
                    <LetterPill letter={grade.bankedLetter} />
                  )}
                </dd>
              </div>

              <div className="rounded-card bg-canvas p-5">
                <dt className="text-[13px] font-medium text-ink-muted">
                  Maximum attainable
                </dt>
                <dd className="mt-2 flex items-baseline gap-2.5">
                  <span className="font-display text-5xl leading-none font-medium tabular-nums">
                    {show(grade.ceiling)}%
                  </span>
                  {grade.ceilingLetter === "F" ? null : (
                    <LetterPill letter={grade.ceilingLetter} />
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <GradeTable
              grade={grade}
              userId={userId}
              courseId={course.id}
              onScore={(id, score) => void setScore(id, score)}
              onSave={(item: GradeItem) => void saveItem(item)}
              onRemove={(id) => void deleteItem(id)}
              onSaveCategory={(category) => void saveCategory(category)}
              onMoveCategory={(from, to) =>
                void reorderCategories(move(mine.map((c) => c.id), from, to))
              }
              onMoveItem={(categoryId, from, to) => {
                const ids = data.items
                  .filter((one) => one.categoryId === categoryId)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((one) => one.id);
                void reorderItems(move(ids, from, to));
              }}
            />

            <div className="rounded-panel bg-surface p-6 shadow-soft lg:sticky lg:top-28">
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
