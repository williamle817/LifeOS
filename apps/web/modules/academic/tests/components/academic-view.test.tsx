import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Course, GradeItem, Semester } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";
import { select } from "@/modules/academic/lib/selection";

type Data = {
  semesters: Semester[];
  courses: Course[];
  categories: Category[];
  items: GradeItem[];
};

let data: Data = { semesters: [], courses: [], categories: [], items: [] };
let error: string | null = null;

const savedCourses: Array<{ course: Course; categories: Category[] }> = [];
const deletedCourses: string[] = [];
const addedSemesters: Semester[] = [];
const deletedSemesters: string[] = [];
const scored: Array<[string, number | null]> = [];
const addedItems: GradeItem[] = [];
const removedItems: string[] = [];

vi.mock("@/modules/academic/lib/course-store", () => ({
  subscribe: () => () => {},
  getSnapshot: () => data,
  getServerSnapshot: () => data,
  currentUserId: () => "u1",
  lastWriteError: () => error,
  ensureLoaded: async () => {},
  addSemester: async (semester: Semester) => {
    addedSemesters.push(semester);
  },
  deleteSemester: async (id: string) => {
    deletedSemesters.push(id);
  },
  saveCourse: async (course: Course, categories: Category[]) => {
    savedCourses.push({ course, categories });
  },
  deleteCourse: async (id: string) => {
    deletedCourses.push(id);
  },
  saveItem: async (item: GradeItem) => {
    addedItems.push(item);
  },
  deleteItem: async (id: string) => {
    removedItems.push(id);
  },
  setScore: async (id: string, score: number | null) => {
    scored.push([id, score]);
  },
  saveCategory: async () => {},
}));

const { AcademicView } = await import(
  "@/modules/academic/components/academic-view"
);

function semester(over: Partial<Semester> = {}): Semester {
  return {
    id: "sem-1",
    userId: "u1",
    name: "Fall 2026",
    startsOn: "2020-08-20",
    ...over,
  };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: "c1",
    userId: "u1",
    semesterId: "sem-1",
    title: "Data Structures",
    code: "CS 201",
    scale: DEFAULT_SCALE,
    ...over,
  };
}

function category(over: Partial<Category> = {}): Category {
  return {
    id: "exams",
    userId: "u1",
    courseId: "c1",
    name: "Exams",
    weight: 100,
    dropLowest: 0,
    extraCredit: false,
    position: 0,
    ...over,
  };
}

function item(over: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "i1",
    userId: "u1",
    courseId: "c1",
    categoryId: "exams",
    title: "Midterm",
    score: null,
    maxScore: 100,
    ...over,
  };
}

beforeEach(() => {
  data = { semesters: [], courses: [], categories: [], items: [] };
  error = null;
  savedCourses.length = 0;
  deletedCourses.length = 0;
  addedSemesters.length = 0;
  deletedSemesters.length = 0;
  scored.length = 0;
  addedItems.length = 0;
  removedItems.length = 0;
  select({ semesterId: null, courseId: null });
});

describe("the academic page, when it is empty", () => {
  it("asks for a semester first", () => {
    render(<AcademicView />);
    expect(screen.getByText(/Add a semester to start/)).toBeDefined();
  });

  it("shows no course strip yet", () => {
    render(<AcademicView />);
    expect(screen.queryByRole("button", { name: "New course" })).toBeNull();
  });

  it("adds a semester", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "New semester" }));
    await user.type(screen.getByLabelText("Semester name"), "Fall 2026");
    await user.click(screen.getByRole("button", { name: "Add semester" }));
    expect(addedSemesters).toHaveLength(1);
    expect(addedSemesters[0].name).toBe("Fall 2026");
  });
});

describe("the academic page, a semester with no courses", () => {
  beforeEach(() => {
    data = { ...data, semesters: [semester()] };
  });

  it("asks for a course", () => {
    render(<AcademicView />);
    expect(screen.getByText(/No courses in this semester yet/)).toBeDefined();
  });

  it("opens the course form", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "New course" }));
    expect(screen.getByRole("heading", { name: "New course" })).toBeDefined();
    expect(screen.getByLabelText("Course name")).toBeDefined();
  });

  it("saves a new course with its categories", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "New course" }));
    await user.type(screen.getByLabelText("Course name"), "Physics");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(savedCourses).toHaveLength(1);
    expect(savedCourses[0].course.title).toBe("Physics");
    expect(savedCourses[0].course.semesterId).toBe("sem-1");
    expect(savedCourses[0].categories).toHaveLength(3);
  });

  it("deletes the semester once the question is answered", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Delete semester" }));
    expect(deletedSemesters).toEqual([]);

    const dialog = screen.getByRole("dialog");
    const go = [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent === "Delete semester",
    )!;
    await user.click(go);
    expect(deletedSemesters).toEqual(["sem-1"]);
  });
});

describe("the academic page, a course with grading set up", () => {
  beforeEach(() => {
    data = {
      semesters: [semester()],
      courses: [course()],
      categories: [category()],
      items: [item({ score: 84 }), item({ id: "i2", title: "Final" })],
    };
  });

  it("shows the current grade and its letter", () => {
    render(<AcademicView />);
    expect(screen.getByText("Current grade")).toBeDefined();
    expect(screen.getAllByText("84%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
  });

  it("shows what is earned and how high the course can still finish", () => {
    render(<AcademicView />);
    expect(screen.getByText("Earned")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("Maximum attainable")).toBeDefined();
    expect(screen.getByText("92%")).toBeDefined();
  });

  it("writes the two point totals out of a hundred", () => {
    render(<AcademicView />);
    expect(screen.getAllByText("/ 100").length).toBeGreaterThanOrEqual(1);
  });

  it("lists what is coming up", () => {
    render(<AcademicView />);
    expect(screen.getByText("Coming up")).toBeDefined();
  });

  it("lists the items", () => {
    render(<AcademicView />);
    expect(screen.getByText("Midterm")).toBeDefined();
    expect(screen.getByText("Final")).toBeDefined();
  });

  it("writes a score down", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.type(screen.getByLabelText("Final score"), "9");
    expect(scored).toEqual([["i2", 9]]);
  });

  it("adds an item", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Add item to Exams" }));
    await user.type(screen.getByLabelText("Item name"), "Quiz 1");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(addedItems).toHaveLength(1);
    expect(addedItems[0].title).toBe("Quiz 1");
  });

  it("removes an item", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Remove Final" }));
    expect(removedItems).toEqual(["i2"]);
  });

  it("opens the course for editing with its values filled in", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit course")).toBeDefined();
    expect(
      (screen.getByLabelText("Course name") as HTMLInputElement).value,
    ).toBe("Data Structures");
    expect(
      (screen.getByLabelText("Category 1 name") as HTMLInputElement).value,
    ).toBe("Exams");
  });

  it("deletes the course", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Delete course" }));
    expect(deletedCourses).toEqual(["c1"]);
  });

  it("goes back to the course without saving", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(savedCourses).toHaveLength(0);
    expect(screen.getByText("Current grade")).toBeDefined();
  });
});

describe("the academic page, several courses and semesters", () => {
  beforeEach(() => {
    data = {
      semesters: [
        semester(),
        semester({ id: "sem-2", name: "Spring 2027", startsOn: "2099-01-10" }),
      ],
      courses: [
        course(),
        course({ id: "c2", code: "MATH 241", title: "Linear Algebra" }),
        course({ id: "c3", code: "PHYS 101", semesterId: "sem-2" }),
      ],
      categories: [category(), category({ id: "cat2", courseId: "c2" })],
      items: [item({ score: 84 })],
    };
  });

  it("opens on the semester that has already started", () => {
    render(<AcademicView />);
    expect((screen.getByLabelText("Semester") as HTMLSelectElement).value).toBe(
      "sem-1",
    );
  });

  it("shows only the courses of that semester", () => {
    render(<AcademicView />);
    expect(screen.getByRole("button", { name: /CS 201/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /PHYS 101/ })).toBeNull();
  });

  it("switches semester and with it the course list", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.selectOptions(screen.getByLabelText("Semester"), "sem-2");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /PHYS 101/ })).toBeDefined(),
    );
    expect(screen.queryByRole("button", { name: /CS 201/ })).toBeNull();
  });

  it("switches course without leaving the page", async () => {
    const user = userEvent.setup();
    render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: /MATH 241/ }));
    await waitFor(() =>
      expect(screen.getByText(/Linear Algebra/)).toBeDefined(),
    );
  });

  it("remembers the course after a fresh render", async () => {
    const user = userEvent.setup();
    const first = render(<AcademicView />);
    await user.click(screen.getByRole("button", { name: /MATH 241/ }));
    first.unmount();
    render(<AcademicView />);
    expect(
      screen
        .getByRole("button", { name: /MATH 241/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("the academic page, when something goes wrong", () => {
  it("says so rather than staying quiet", () => {
    data = { ...data, semesters: [semester()] };
    error = "permission denied";
    render(<AcademicView />);
    expect(screen.getByText(/permission denied/)).toBeDefined();
  });

  it("says so when nothing is waiting on a score", () => {
    data = {
      semesters: [semester()],
      courses: [course()],
      categories: [category()],
      items: [item({ score: 90 })],
    };
    render(<AcademicView />);
    expect(screen.getByText(/Nothing waiting on a score/)).toBeDefined();
  });
});
