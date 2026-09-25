import { describe, expect, it, vi } from "vitest";
import type { Course, Semester } from "@lifeos/contracts";
import { DEFAULT_SCALE } from "@lifeos/contracts";

type Module = typeof import("@/modules/academic/lib/selection");

async function fresh(): Promise<Module> {
  vi.resetModules();
  return import("@/modules/academic/lib/selection");
}

function semester(id: string, startsOn: string): Semester {
  return { id, userId: "u1", name: id, startsOn };
}

function course(id: string, semesterId: string): Course {
  return {
    id,
    userId: "u1",
    semesterId,
    title: id,
    scale: DEFAULT_SCALE,
  };
}

describe("defaultSemesterId", () => {
  it("has nothing to pick when there are no semesters", async () => {
    const { defaultSemesterId } = await fresh();
    expect(defaultSemesterId([], "2026-09-25")).toBeNull();
  });

  it("picks the term that has already started", async () => {
    const { defaultSemesterId } = await fresh();
    const out = defaultSemesterId(
      [semester("spring", "2026-01-10"), semester("fall", "2026-08-20")],
      "2026-09-25",
    );
    expect(out).toBe("fall");
  });

  it("counts a term that starts today as started", async () => {
    const { defaultSemesterId } = await fresh();
    expect(
      defaultSemesterId([semester("fall", "2026-09-25")], "2026-09-25"),
    ).toBe("fall");
  });

  it("does not jump ahead to a term that has not begun", async () => {
    const { defaultSemesterId } = await fresh();
    const out = defaultSemesterId(
      [semester("fall", "2026-08-20"), semester("spring", "2027-01-10")],
      "2026-09-25",
    );
    expect(out).toBe("fall");
  });

  it("falls back to the earliest when none has started", async () => {
    const { defaultSemesterId } = await fresh();
    const out = defaultSemesterId(
      [semester("later", "2027-08-20"), semester("sooner", "2027-01-10")],
      "2026-09-25",
    );
    expect(out).toBe("sooner");
  });
});

describe("resolve", () => {
  it("lands on the current semester and its first course", async () => {
    const { resolve, getSnapshot } = await fresh();
    const out = resolve(
      [semester("fall", "2026-08-20")],
      [course("a", "fall"), course("b", "fall")],
      getSnapshot(),
      "2026-09-25",
    );
    expect(out).toEqual({ semesterId: "fall", courseId: "a" });
  });

  it("keeps a choice that still makes sense", async () => {
    const { resolve } = await fresh();
    const out = resolve(
      [semester("fall", "2026-08-20"), semester("spring", "2026-01-10")],
      [course("a", "fall"), course("z", "spring")],
      { semesterId: "spring", courseId: "z" },
      "2026-09-25",
    );
    expect(out).toEqual({ semesterId: "spring", courseId: "z" });
  });

  it("drops a course that belongs to another semester", async () => {
    const { resolve } = await fresh();
    const out = resolve(
      [semester("fall", "2026-08-20"), semester("spring", "2026-01-10")],
      [course("a", "fall"), course("z", "spring")],
      { semesterId: "fall", courseId: "z" },
      "2026-09-25",
    );
    expect(out.courseId).toBe("a");
  });

  it("forgets a semester that was deleted", async () => {
    const { resolve } = await fresh();
    const out = resolve(
      [semester("fall", "2026-08-20")],
      [course("a", "fall")],
      { semesterId: "gone", courseId: null },
      "2026-09-25",
    );
    expect(out.semesterId).toBe("fall");
  });

  it("has no course when the semester is empty", async () => {
    const { resolve } = await fresh();
    const out = resolve(
      [semester("fall", "2026-08-20")],
      [],
      { semesterId: null, courseId: null },
      "2026-09-25",
    );
    expect(out).toEqual({ semesterId: "fall", courseId: null });
  });

  it("has nothing at all before the first semester exists", async () => {
    const { resolve } = await fresh();
    expect(
      resolve([], [], { semesterId: null, courseId: null }, "2026-09-25"),
    ).toEqual({ semesterId: null, courseId: null });
  });
});

describe("remembering the choice", () => {
  it("starts with nothing chosen", async () => {
    const { getSnapshot } = await fresh();
    expect(getSnapshot()).toEqual({ semesterId: null, courseId: null });
  });

  it("starts with nothing chosen on the server", async () => {
    const { getServerSnapshot } = await fresh();
    expect(getServerSnapshot()).toEqual({ semesterId: null, courseId: null });
  });

  it("keeps what was chosen", async () => {
    const { select, getSnapshot } = await fresh();
    select({ courseId: "a" });
    expect(getSnapshot().courseId).toBe("a");
  });

  it("changes one half without losing the other", async () => {
    const { select, getSnapshot } = await fresh();
    select({ semesterId: "fall", courseId: "a" });
    select({ courseId: "b" });
    expect(getSnapshot()).toEqual({ semesterId: "fall", courseId: "b" });
  });

  it("hands back the same object until something changes", async () => {
    const { getSnapshot } = await fresh();
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("tells subscribers", async () => {
    const { subscribe, select } = await fresh();
    const seen = vi.fn();
    const off = subscribe(seen);
    select({ courseId: "a" });
    expect(seen).toHaveBeenCalledOnce();
    off();
    select({ courseId: "b" });
    expect(seen).toHaveBeenCalledOnce();
  });

  it("survives a browser with no storage at all", async () => {
    const { select, getSnapshot } = await fresh();
    expect(() => select({ courseId: "a" })).not.toThrow();
    expect(getSnapshot().courseId).toBe("a");
  });
});
