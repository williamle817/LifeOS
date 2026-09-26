"use client";

import { useState } from "react";
import type { Semester } from "@lifeos/contracts";
import { ActionIcon } from "@/components/icons";
import { Confirm } from "@/modules/academic/components/confirm";

const input =
  "rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-accent";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SemesterBar({
  semesters,
  selected,
  onSelect,
  onAdd,
  onSave,
  onDelete,
}: {
  semesters: Semester[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, startsOn: string) => void;
  onSave: (semester: Semester) => void;
  onDelete: (id: string) => void;
}) {
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today);

  const ordered = [...semesters].sort((a, b) =>
    b.startsOn.localeCompare(a.startsOn),
  );

  const open = semesters.find((semester) => semester.id === selected);

  function startAdd() {
    setName("");
    setStartsOn(today());
    setMode("add");
  }

  function startEdit() {
    if (!open) return;
    setName(open.name);
    setStartsOn(open.startsOn);
    setMode("edit");
  }

  function submit() {
    if (!name.trim()) return;
    if (mode === "edit" && open) {
      onSave({ ...open, name: name.trim(), startsOn });
    } else {
      onAdd(name.trim(), startsOn);
    }
    setMode(null);
  }

  if (mode) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-faint">Name</span>
          <input
            aria-label="Semester name"
            autoFocus
            required
            value={name}
            placeholder="Fall 2026"
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-faint">Starts on</span>
          <input
            aria-label="Starts on"
            type="date"
            required
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            className={input}
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110"
        >
          {mode === "edit" ? "Save semester" : "Add semester"}
        </button>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
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

      {open ? (
        <button
          type="button"
          aria-label={`Edit ${open.name}`}
          onClick={startEdit}
          className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ActionIcon name="edit" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={startAdd}
        className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
      >
        New semester
      </button>

      {selected ? (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="rounded-full px-3 py-1.5 text-[13px] text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
        >
          Delete semester
        </button>
      ) : null}

      {asking && open ? (
        <Confirm
          title={`Delete ${open.name}?`}
          body="Its courses, their grading and every score in them go with it. This cannot be undone."
          action="Delete semester"
          onConfirm={() => {
            setAsking(false);
            onDelete(open.id);
          }}
          onCancel={() => setAsking(false)}
        />
      ) : null}
    </div>
  );
}
