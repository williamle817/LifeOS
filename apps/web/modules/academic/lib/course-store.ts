import type {
  Category,
  Course,
  EventColor,
  GradeItem,
  ScaleStep,
  Semester,
} from "@lifeos/contracts";
import { supabase } from "@/lib/supabase";

export type Academic = {
  semesters: Semester[];
  courses: Course[];
  categories: Category[];
  items: GradeItem[];
};

const NONE: Academic = {
  semesters: [],
  courses: [],
  categories: [],
  items: [],
};

let cache: Academic = NONE;
let userId: string | null = null;
let lastError: string | null = null;
const listeners = new Set<() => void>();

type SemesterRow = {
  id: string;
  user_id: string;
  name: string;
  starts_on: string;
};

type CourseRow = {
  id: string;
  user_id: string;
  semester_id: string;
  title: string;
  code: string | null;
  color: EventColor | null;
  scale: ScaleStep[];
};

type CategoryRow = {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  weight: number;
  drop_lowest: number;
  extra_credit: boolean;
  position: number;
};

type ItemRow = {
  id: string;
  user_id: string;
  course_id: string;
  category_id: string;
  title: string;
  score: number | null;
  max_score: number;
  due_on: string | null;
  event_id: string | null;
};

function emit(): void {
  for (const listener of listeners) listener();
}

function owner(value?: string): string {
  return value || (userId ?? "");
}

function toSemester(row: SemesterRow): Semester {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startsOn: row.starts_on,
  };
}

function semesterRow(value: Semester): SemesterRow {
  return {
    id: value.id,
    user_id: owner(value.userId),
    name: value.name,
    starts_on: value.startsOn,
  };
}

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    userId: row.user_id,
    semesterId: row.semester_id,
    title: row.title,
    ...(row.code ? { code: row.code } : {}),
    ...(row.color ? { color: row.color } : {}),
    scale: row.scale,
  };
}

function courseRow(value: Course): CourseRow {
  return {
    id: value.id,
    user_id: owner(value.userId),
    semester_id: value.semesterId,
    title: value.title,
    code: value.code ?? null,
    color: value.color ?? null,
    scale: value.scale,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    name: row.name,
    weight: row.weight,
    dropLowest: row.drop_lowest,
    extraCredit: row.extra_credit,
    position: row.position,
  };
}

function categoryRow(value: Category): CategoryRow {
  return {
    id: value.id,
    user_id: owner(value.userId),
    course_id: value.courseId,
    name: value.name,
    weight: value.weight,
    drop_lowest: value.dropLowest,
    extra_credit: value.extraCredit,
    position: value.position,
  };
}

function toItem(row: ItemRow): GradeItem {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    categoryId: row.category_id,
    title: row.title,
    score: row.score,
    maxScore: row.max_score,
    ...(row.due_on ? { dueOn: row.due_on } : {}),
    ...(row.event_id ? { eventId: row.event_id } : {}),
  };
}

function itemRow(value: GradeItem): ItemRow {
  return {
    id: value.id,
    user_id: owner(value.userId),
    course_id: value.courseId,
    category_id: value.categoryId,
    title: value.title,
    score: value.score,
    max_score: value.maxScore,
    due_on: value.dueOn ?? null,
    event_id: value.eventId ?? null,
  };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Academic {
  return cache;
}

export function getServerSnapshot(): Academic {
  return NONE;
}

export function currentUserId(): string | null {
  return userId;
}

export function lastWriteError(): string | null {
  return lastError;
}

let loading: Promise<void> | null = null;

export async function ensureLoaded(): Promise<void> {
  if (userId) return;
  loading ??= loadAcademic().finally(() => {
    loading = null;
  });
  await loading;
}

export async function loadAcademic(): Promise<void> {
  const { data: me } = await supabase.from("users").select("id").single();
  if (!me) return;
  userId = me.id;

  const [semesters, courses, categories, items] = await Promise.all([
    supabase.from("semesters").select("*"),
    supabase.from("courses").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("grade_items").select("*"),
  ]);

  cache = {
    semesters: ((semesters.data ?? []) as SemesterRow[]).map(toSemester),
    courses: ((courses.data ?? []) as CourseRow[]).map(toCourse),
    categories: ((categories.data ?? []) as CategoryRow[]).map(toCategory),
    items: ((items.data ?? []) as ItemRow[]).map(toItem),
  };
  emit();
}

async function guard(
  run: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await run;
  if (!error) return;
  lastError = error.message;
  await loadAcademic();
  emit();
}

export async function addSemester(semester: Semester): Promise<void> {
  await ensureLoaded();
  lastError = null;
  const saved = { ...semester, userId: owner(semester.userId) };
  cache = { ...cache, semesters: [...cache.semesters, saved] };
  emit();
  await guard(supabase.from("semesters").insert(semesterRow(saved)));
}

export async function renameSemester(semester: Semester): Promise<void> {
  await ensureLoaded();
  lastError = null;
  cache = {
    ...cache,
    semesters: cache.semesters.map((s) =>
      s.id === semester.id ? semester : s,
    ),
  };
  emit();
  await guard(
    supabase
      .from("semesters")
      .update(semesterRow(semester))
      .eq("id", semester.id),
  );
}

export async function deleteSemester(id: string): Promise<void> {
  await ensureLoaded();
  lastError = null;
  const courses = cache.courses.filter((c) => c.semesterId === id);
  const ids = new Set(courses.map((c) => c.id));
  cache = {
    semesters: cache.semesters.filter((s) => s.id !== id),
    courses: cache.courses.filter((c) => c.semesterId !== id),
    categories: cache.categories.filter((c) => !ids.has(c.courseId)),
    items: cache.items.filter((i) => !ids.has(i.courseId)),
  };
  emit();
  await guard(supabase.from("semesters").delete().eq("id", id));
}

export async function saveCourse(
  course: Course,
  categories: Category[],
): Promise<void> {
  await ensureLoaded();
  lastError = null;

  const saved = { ...course, userId: owner(course.userId) };
  const exists = cache.courses.some((c) => c.id === course.id);
  const mine = categories.map((category, index) => ({
    ...category,
    userId: owner(category.userId),
    courseId: course.id,
    position: index,
  }));

  const before = cache.categories.filter((c) => c.courseId === course.id);
  const keep = new Set(mine.map((c) => c.id));
  const gone = before.filter((c) => !keep.has(c.id));
  const had = new Set(before.map((c) => c.id));
  const fresh = mine.filter((c) => !had.has(c.id));
  const changed = mine.filter((c) => had.has(c.id));
  const goneIds = new Set(gone.map((c) => c.id));

  cache = {
    ...cache,
    courses: exists
      ? cache.courses.map((c) => (c.id === course.id ? saved : c))
      : [...cache.courses, saved],
    categories: [
      ...cache.categories.filter((c) => c.courseId !== course.id),
      ...mine,
    ],
    items: cache.items.filter((i) => !goneIds.has(i.categoryId)),
  };
  emit();

  await guard(
    exists
      ? supabase.from("courses").update(courseRow(saved)).eq("id", course.id)
      : supabase.from("courses").insert(courseRow(saved)),
  );

  if (gone.length) {
    await guard(
      supabase
        .from("categories")
        .delete()
        .in("id", gone.map((c) => c.id)),
    );
  }
  if (fresh.length) {
    await guard(
      supabase.from("categories").insert(fresh.map(categoryRow)),
    );
  }
  for (const category of changed) {
    await guard(
      supabase
        .from("categories")
        .update(categoryRow(category))
        .eq("id", category.id),
    );
  }
}

export async function saveCategory(category: Category): Promise<void> {
  await ensureLoaded();
  lastError = null;
  const saved = { ...category, userId: owner(category.userId) };
  cache = {
    ...cache,
    categories: cache.categories.map((c) => (c.id === saved.id ? saved : c)),
  };
  emit();
  await guard(
    supabase
      .from("categories")
      .update(categoryRow(saved))
      .eq("id", saved.id),
  );
}

export async function deleteCourse(id: string): Promise<void> {
  await ensureLoaded();
  lastError = null;
  cache = {
    ...cache,
    courses: cache.courses.filter((c) => c.id !== id),
    categories: cache.categories.filter((c) => c.courseId !== id),
    items: cache.items.filter((i) => i.courseId !== id),
  };
  emit();
  await guard(supabase.from("courses").delete().eq("id", id));
}

export async function saveItem(gradeItem: GradeItem): Promise<void> {
  await ensureLoaded();
  lastError = null;
  const saved = { ...gradeItem, userId: owner(gradeItem.userId) };
  const exists = cache.items.some((i) => i.id === saved.id);
  cache = {
    ...cache,
    items: exists
      ? cache.items.map((i) => (i.id === saved.id ? saved : i))
      : [...cache.items, saved],
  };
  emit();
  await guard(
    exists
      ? supabase.from("grade_items").update(itemRow(saved)).eq("id", saved.id)
      : supabase.from("grade_items").insert(itemRow(saved)),
  );
}

export async function deleteItem(id: string): Promise<void> {
  await ensureLoaded();
  lastError = null;
  cache = { ...cache, items: cache.items.filter((i) => i.id !== id) };
  emit();
  await guard(supabase.from("grade_items").delete().eq("id", id));
}

export async function setScore(
  id: string,
  score: number | null,
): Promise<void> {
  const found = cache.items.find((i) => i.id === id);
  if (!found) return;
  await saveItem({ ...found, score });
}
