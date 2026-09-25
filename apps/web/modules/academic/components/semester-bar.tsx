"use client";

import { useState } from "react";
import type { Semester } from "@lifeos/contracts";

const input =
  "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent";

export function SemesterBar({
  semesters,
  selected,
  onSelect,
  onAdd,
  onDelete,
}: {
  semesters: Semester[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, startsOn: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const ordered = [...semesters].sort((a, b) =>
    b.startsOn.localeCompare(a.startsOn),
  );

  if (adding) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onAdd(name.trim(), startsOn);
          setName("");
          setAdding(false);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          aria-label="Semester name"
          autoFocus
          required
          value={name}
          placeholder="Fall 2026"
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <input
          aria-label="Starts on"
          type="date"
          required
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          className={input}
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-surface"
        >
          Add semester
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {semesters.length ? (
        <label className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Semester</span>
          <select
            value={selected ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            className={input}
          >
            {ordered.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
      >
        New semester
      </button>

      {selected ? (
        <button
          type="button"
          onClick={() => onDelete(selected)}
          className="rounded-lg px-3 py-1.5 text-[13px] text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          Delete semester
        </button>
      ) : null}
    </div>
  );
}
