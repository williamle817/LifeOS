import type {
  Category,
  Course,
  EventColor,
  GradeItem,
  ScaleStep,
  Semester,
} from "@lifeos/contracts";
import { createStore, currentUserId, owner } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export { currentUserId };

type Academic = {
  semesters: Semester[];
  courses: Course[];
  categories: Category[];
  items: GradeItem[];
};

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
  position: number | null;
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
  position: number | null;
};

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
    position: row.position ?? 0,
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
    position: value.position ?? 0,
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
    position: row.position ?? 0,
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
    position: value.position ?? 0,
  };
}

const NONE: Academic = {
  semesters: [],
  courses: [],
  categories: [],
  items: [],
};

const store = createStore(NONE, async () => {
  const [semesters, courses, categories, items] = await Promise.all([
    supabase.from("semesters").select("*"),
    supabase.from("courses").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("grade_items").select("*"),
  ]);
  return {
    semesters: ((semesters.data ?? []) as SemesterRow[]).map(toSemester),
    courses: ((courses.data ?? []) as CourseRow[]).map(toCourse),
    categories: ((categories.data ?? []) as CategoryRow[]).map(toCategory),
    items: ((items.data ?? []) as ItemRow[]).map(toItem),
  };
});

export const {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  lastWriteError,
  ensureLoaded,
} = store;

function change(patch: Partial<Academic>): void {
  store.set({ ...getSnapshot(), ...patch });
}

export async function addSemester(semester: Semester): Promise<void> {
  await store.begin();
  const saved = { ...semester, userId: owner(semester.userId) };
  change({ semesters: [...getSnapshot().semesters, saved] });
  await store.write(supabase.from("semesters").insert(semesterRow(saved)));
}

export async function saveSemester(semester: Semester): Promise<void> {
  await store.begin();
  change({
    semesters: getSnapshot().semesters.map((s) =>
      s.id === semester.id ? semester : s,
    ),
  });
  await store.write(
    supabase
      .from("semesters")
      .update(semesterRow(semester))
      .eq("id", semester.id),
  );
}

export async function deleteSemester(id: string): Promise<void> {
  await store.begin();
  const now = getSnapshot();
  const ids = new Set(
    now.courses.filter((c) => c.semesterId === id).map((c) => c.id),
  );
  store.set({
    semesters: now.semesters.filter((s) => s.id !== id),
    courses: now.courses.filter((c) => !ids.has(c.id)),
    categories: now.categories.filter((c) => !ids.has(c.courseId)),
    items: now.items.filter((i) => !ids.has(i.courseId)),
  });
  await store.write(supabase.from("semesters").delete().eq("id", id));
}

export async function saveCourse(
  course: Course,
  categories: Category[],
): Promise<void> {
  await store.begin();
  const now = getSnapshot();
  const exists = now.courses.some((c) => c.id === course.id);
  const saved = {
    ...course,
    userId: owner(course.userId),
    position:
      course.position ??
      (exists
        ? 0
        : now.courses.filter((c) => c.semesterId === course.semesterId).length),
  };
  const mine = categories.map((category, index) => ({
    ...category,
    userId: owner(category.userId),
    courseId: course.id,
    position: index,
  }));

  const before = new Map(
    now.categories
      .filter((c) => c.courseId === course.id)
      .map((c) => [c.id, c]),
  );
  const keep = new Set(mine.map((c) => c.id));
  const gone = [...before.keys()].filter((id) => !keep.has(id));
  const touched = mine.filter(
    (c) => JSON.stringify(before.get(c.id)) !== JSON.stringify(c),
  );

  store.set({
    ...now,
    courses: exists
      ? now.courses.map((c) => (c.id === course.id ? saved : c))
      : [...now.courses, saved],
    categories: [
      ...now.categories.filter((c) => c.courseId !== course.id),
      ...mine,
    ],
    items: now.items.filter((i) => !gone.includes(i.categoryId)),
  });

  await store.write(
    exists
      ? supabase.from("courses").update(courseRow(saved)).eq("id", course.id)
      : supabase.from("courses").insert(courseRow(saved)),
  );
  if (gone.length) {
    await store.write(supabase.from("categories").delete().in("id", gone));
  }
  if (touched.length) {
    await store.write(
      supabase.from("categories").upsert(touched.map(categoryRow)),
    );
  }
}

export async function saveCategory(category: Category): Promise<void> {
  await store.begin();
  const saved = { ...category, userId: owner(category.userId) };
  change({
    categories: getSnapshot().categories.map((c) =>
      c.id === saved.id ? saved : c,
    ),
  });
  await store.write(
    supabase.from("categories").update(categoryRow(saved)).eq("id", saved.id),
  );
}

export async function deleteCourse(id: string): Promise<void> {
  await store.begin();
  const now = getSnapshot();
  change({
    courses: now.courses.filter((c) => c.id !== id),
    categories: now.categories.filter((c) => c.courseId !== id),
    items: now.items.filter((i) => i.courseId !== id),
  });
  await store.write(supabase.from("courses").delete().eq("id", id));
}

export async function saveItem(gradeItem: GradeItem): Promise<void> {
  await store.begin();
  const items = getSnapshot().items;
  const exists = items.some((i) => i.id === gradeItem.id);
  const saved = {
    ...gradeItem,
    userId: owner(gradeItem.userId),
    position:
      gradeItem.position ??
      (exists
        ? 0
        : items.filter((i) => i.categoryId === gradeItem.categoryId).length),
  };
  change({
    items: exists
      ? items.map((i) => (i.id === saved.id ? saved : i))
      : [...items, saved],
  });
  await store.write(
    exists
      ? supabase.from("grade_items").update(itemRow(saved)).eq("id", saved.id)
      : supabase.from("grade_items").insert(itemRow(saved)),
  );
}

function renumber<T extends { id: string; position?: number }>(
  rows: T[],
  ids: string[],
): T[] {
  return rows.map((row) => {
    const at = ids.indexOf(row.id);
    return at < 0 || row.position === at ? row : { ...row, position: at };
  });
}

async function reorder<T extends { id: string; position?: number }>(
  rows: T[],
  ids: string[],
  apply: (next: T[]) => void,
  table: string,
  toRow: (row: T) => object,
): Promise<void> {
  const next = renumber(rows, ids);
  const moved = next.filter((row, i) => row !== rows[i]);
  if (!moved.length) return;
  apply(next);
  await store.write(supabase.from(table).upsert(moved.map(toRow)));
}

export async function reorderCourses(ids: string[]): Promise<void> {
  await store.begin();
  await reorder(
    getSnapshot().courses,
    ids,
    (courses) => change({ courses }),
    "courses",
    courseRow,
  );
}

export async function reorderCategories(ids: string[]): Promise<void> {
  await store.begin();
  await reorder(
    getSnapshot().categories,
    ids,
    (categories) => change({ categories }),
    "categories",
    categoryRow,
  );
}

export async function reorderItems(ids: string[]): Promise<void> {
  await store.begin();
  await reorder(
    getSnapshot().items,
    ids,
    (items) => change({ items }),
    "grade_items",
    itemRow,
  );
}

export async function deleteItem(id: string): Promise<void> {
  await store.begin();
  change({ items: getSnapshot().items.filter((i) => i.id !== id) });
  await store.write(supabase.from("grade_items").delete().eq("id", id));
}

export async function setScore(
  id: string,
  score: number | null,
): Promise<void> {
  const found = getSnapshot().items.find((i) => i.id === id);
  if (!found) return;
  await saveItem({ ...found, score });
}
