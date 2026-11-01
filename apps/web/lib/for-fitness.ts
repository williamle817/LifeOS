import type { GymEvent, LifeEvent } from "@lifeos/contracts";
import { parseDay, shiftDay } from "@/lib/dates";
import { hoursOf } from "@/lib/from-schedule";
import { dayKey, expand } from "@/modules/schedule/lib/recurrence";

export {
  subscribeEvents,
  eventsSnapshot,
  eventsServer,
  ensureEvents,
  hoursOf,
} from "@/lib/from-schedule";

export function onDay(event: LifeEvent): string {
  return dayKey(event.start);
}

export function mondayOf(day: string): string {
  return shiftDay(day, -((parseDay(day).getDay() + 6) % 7));
}

export function workoutsIn(events: LifeEvent[], monday: string): GymEvent[] {
  const end = shiftDay(monday, 7);

  return expand(events, parseDay(monday), parseDay(end))
    .filter((one): one is GymEvent => {
      if (one.type !== "gym") return false;
      const on = dayKey(one.start);
      return on >= monday && on < end;
    })
    .sort((a, b) => {
      const gap = new Date(a.start).getTime() - new Date(b.start).getTime();
      return gap || a.title.localeCompare(b.title);
    });
}

export function weekTotals(workouts: GymEvent[]): {
  sessions: number;
  minutes: number;
  calories: number;
} {
  let minutes = 0;
  let calories = 0;
  for (const one of workouts) {
    minutes += Math.round(hoursOf(one) * 60);
    calories += one.calories ?? 0;
  }
  return { sessions: workouts.length, minutes, calories };
}
