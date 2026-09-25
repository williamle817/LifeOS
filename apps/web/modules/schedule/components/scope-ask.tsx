"use client";

import { EDIT_SCOPES, type EditScope } from "@lifeos/contracts";

const SCOPE_LABELS: Record<EditScope, string> = {
  one: "This event",
  following: "This and following events",
  all: "All events",
};

export function ScopeAsk({
  title,
  onPick,
  onCancel,
}: {
  title: string;
  onPick: (scope: EditScope) => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-3 grid gap-2">
        {EDIT_SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => onPick(scope)}
            className="rounded-lg border border-line px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-muted"
          >
            {SCOPE_LABELS[scope]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 rounded-lg px-3 py-1.5 text-[13px] text-ink-muted hover:bg-surface-muted"
      >
        Cancel
      </button>
    </div>
  );
}
