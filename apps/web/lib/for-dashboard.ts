import type {
  Course,
  Flow,
  GradeItem,
  LifeEvent,
  Semester,
} from "@lifeos/contracts";
import { daysBetween, parseDay, shiftDay } from "@/lib/dates";
import { spendingIn } from "@/lib/from-schedule";
import { dayKey, expand } from "@/modules/schedule/lib/recurrence";
import { defaultSemesterId } from "@/modules/academic/lib/selection";
import {
  shift,
  thisMonth,
  type Dated,
} from "@/modules/finance/lib/month";

export {
  subscribeEvents,
  eventsSnapshot,
  eventsServer,
  ensureEvents,
  incomeIn,
} from "@/lib/from-schedule";

export {
  subscribe as subscribeAcademic,
  getSnapshot as academicSnapshot,
  getServerSnapshot as academicServer,
  ensureLoaded as ensureAcademic,
} from "@/modules/academic/lib/course-store";

export {
  subscribe as subscribeFlows,
  getSnapshot as flowsSnapshot,
  getServerSnapshot as flowsServer,
  ensureLoaded as ensureFlows,
} from "@/modules/finance/lib/flow-store";

export {
  money,
  monthLabel,
  thisMonth,
  total,
  whenLabel,
} from "@/modules/finance/lib/month";

export type Deadline = {
  item: GradeItem;
  course: Course;
  due: string;
  days: number;
};

function byStart(a: LifeEvent, b: LifeEvent): number {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
  const gap = new Date(a.start).getTime() - new Date(b.start).getTime();
  return gap || a.title.localeCompare(b.title);
}

export function eventsOn(events: LifeEvent[], day: string): LifeEvent[] {
  const from = parseDay(day);
  const to = parseDay(shiftDay(day, 1));

  return expand(events, from, to)
    .filter((one) => {
      if (!one.allDay) {
        return new Date(one.start) < to && new Date(one.end) > from;
      }
      const first = dayKey(one.start);
      return first === day || (first < day && day < dayKey(one.end));
    })
    .sort(byStart);
}

export function deadlines(
  academic: { semesters: Semester[]; courses: Course[]; items: GradeItem[] },
  today: string,
): Deadline[] {
  const semesterId = defaultSemesterId(academic.semesters, today);
  const courses = new Map(
    academic.courses
      .filter((course) => course.semesterId === semesterId)
      .map((course) => [course.id, course]),
  );

  return academic.items
    .flatMap((item) => {
      const course = courses.get(item.courseId);
      if (item.score !== null || !item.dueOn || !course) return [];
      return [
        { item, course, due: item.dueOn, days: daysBetween(today, item.dueOn) },
      ];
    })
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) || a.item.title.localeCompare(b.item.title),
    );
}

export function upcomingCharges(
  flows: Flow[],
  events: LifeEvent[],
  today: string,
): Dated[] {
  const month = thisMonth(parseDay(today));

  return [month, shift(month, 1)]
    .flatMap((one) => spendingIn(flows, events, one))
    .filter((one) => one.on > today)
    .sort(
      (a, b) =>
        a.on.localeCompare(b.on) || a.flow.title.localeCompare(b.flow.title),
    );
}
