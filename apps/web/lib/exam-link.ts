import type { GradeItem, LifeEvent } from "@lifeos/contracts";
import { dayKey, shiftDay } from "@/modules/schedule/lib/recurrence";
import {
  deleteEvent,
  ensureLoaded as ensureEvents,
  getSnapshot as eventSnapshot,
  updateEvent,
} from "@/modules/schedule/lib/event-store";
import {
  deleteItem,
  ensureLoaded as ensureAcademic,
  getSnapshot as academicSnapshot,
  linkExamItem,
  saveItem,
  unlinkExamItem,
} from "@/modules/academic/lib/course-store";

export function withDay(iso: string, day: string): string {
  if (iso.length <= 10) return day;
  const at = new Date(iso);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    at.getHours(),
    at.getMinutes(),
    at.getSeconds(),
    at.getMilliseconds(),
  ).toISOString();
}

function isExam(event: LifeEvent): boolean {
  return event.type === "exam";
}

function pointsSomewhere(event: LifeEvent): boolean {
  if (event.type !== "exam") return false;
  if (!event.courseId || !event.categoryId) return false;
  const data = academicSnapshot();
  return (
    data.courses.some((course) => course.id === event.courseId) &&
    data.categories.some((category) => category.id === event.categoryId)
  );
}

function sameAsEvent(item: GradeItem, event: LifeEvent): boolean {
  if (event.type !== "exam") return false;
  return (
    item.courseId === event.courseId &&
    item.categoryId === event.categoryId &&
    item.title === event.title &&
    item.maxScore === event.maxScore &&
    item.dueOn === dayKey(event.start)
  );
}

export async function examSaved(event: LifeEvent): Promise<void> {
  if (!isExam(event)) return;
  await ensureAcademic();

  if (!pointsSomewhere(event)) {
    await unlinkExamItem(event.id);
    return;
  }

  const exam = event as Extract<LifeEvent, { type: "exam" }>;
  await linkExamItem({
    eventId: exam.id,
    courseId: exam.courseId!,
    categoryId: exam.categoryId!,
    title: exam.title,
    maxScore: exam.maxScore,
    dueOn: dayKey(exam.start),
  });
}

export async function examRemoved(eventId: string): Promise<void> {
  await ensureAcademic();
  await unlinkExamItem(eventId);
}

export async function itemSaved(item: GradeItem): Promise<void> {
  await saveItem(item);
  if (!item.eventId) return;

  await ensureEvents();
  const found = eventSnapshot().find((event) => event.id === item.eventId);
  if (!found || found.type !== "exam") return;

  const day = item.dueOn ?? dayKey(found.start);
  const start = withDay(found.start, day);
  const end = found.allDay
    ? shiftDay(day, 1)
    : new Date(
        new Date(start).getTime() +
          (new Date(found.end).getTime() - new Date(found.start).getTime()),
      ).toISOString();

  const next = {
    ...found,
    title: item.title,
    maxScore: item.maxScore,
    start,
    end,
  } as LifeEvent;

  if (
    found.title === next.title &&
    found.maxScore === item.maxScore &&
    found.start === next.start &&
    found.end === next.end
  ) {
    return;
  }

  await updateEvent(next);
}

export async function itemRemoved(id: string): Promise<void> {
  await ensureAcademic();
  const found = academicSnapshot().items.find((item) => item.id === id);
  await deleteItem(id);
  if (!found?.eventId) return;
  await ensureEvents();
  if (!eventSnapshot().some((event) => event.id === found.eventId)) return;
  await deleteEvent(found.eventId);
}

export async function reconcile(): Promise<void> {
  await ensureEvents();
  await ensureAcademic();

  for (const item of academicSnapshot().items) {
    if (!item.eventId) continue;
    if (eventSnapshot().some((event) => event.id === item.eventId)) continue;
    await deleteItem(item.id);
  }

  for (const event of eventSnapshot()) {
    if (!isExam(event)) continue;
    const exam = event as Extract<LifeEvent, { type: "exam" }>;

    if (!pointsSomewhere(exam)) {
      await unlinkExamItem(exam.id);
      if (exam.courseId || exam.categoryId) {
        await updateEvent({
          ...exam,
          courseId: undefined,
          categoryId: undefined,
        } as LifeEvent);
      }
      continue;
    }

    const linked = academicSnapshot().items.find(
      (item) => item.eventId === exam.id,
    );
    if (linked && sameAsEvent(linked, exam)) continue;

    await linkExamItem({
      eventId: exam.id,
      courseId: exam.courseId!,
      categoryId: exam.categoryId!,
      title: exam.title,
      maxScore: exam.maxScore,
      dueOn: dayKey(exam.start),
    });
  }
}
