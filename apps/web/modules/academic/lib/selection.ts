import type { Course, Semester } from "@lifeos/contracts";

const KEY = "lifeos.academic.selection";

export type Selection = { semesterId: string | null; courseId: string | null };

const EMPTY: Selection = { semesterId: null, courseId: null };

let cache: Selection | null = null;
const listeners = new Set<() => void>();

function read(): Selection {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Selection>;
    return {
      semesterId: parsed.semesterId ?? null,
      courseId: parsed.courseId ?? null,
    };
  } catch {
    return EMPTY;
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Selection {
  cache ??= read();
  return cache;
}

export function getServerSnapshot(): Selection {
  return EMPTY;
}

function persist(value: Selection): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function select(patch: Partial<Selection>): void {
  cache = { ...getSnapshot(), ...patch };
  persist(cache);
  for (const listener of listeners) listener();
}

export function defaultSemesterId(
  semesters: Semester[],
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (!semesters.length) return null;
  const byDate = [...semesters].sort((a, b) =>
    a.startsOn.localeCompare(b.startsOn),
  );
  const started = byDate.filter((s) => s.startsOn <= today);
  const pick = started.length ? started[started.length - 1] : byDate[0];
  return pick.id;
}

export function resolve(
  semesters: Semester[],
  courses: Course[],
  selection: Selection,
  today?: string,
): { semesterId: string | null; courseId: string | null } {
  const semesterId =
    semesters.find((s) => s.id === selection.semesterId)?.id ??
    defaultSemesterId(semesters, today);

  const mine = courses.filter((c) => c.semesterId === semesterId);
  const courseId =
    mine.find((c) => c.id === selection.courseId)?.id ?? mine[0]?.id ?? null;

  return { semesterId, courseId };
}
