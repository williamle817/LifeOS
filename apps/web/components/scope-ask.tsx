"use client";

import { EDIT_SCOPES, type EditScope } from "@lifeos/contracts";

const SCOPE_LABELS: Record<EditScope, (one: string, many: string) => string> = {
  one: (noun) => `This ${noun}`,
  following: (_noun, many) => `This and following ${many}`,
  all: (_noun, many) => `All ${many}`,
};

export function ScopeAsk({
  noun = "event",
  plural = "events",
  onPick,
  onCancel,
}: {
  noun?: string;
  plural?: string;
  onPick: (scope: EditScope) => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3">
      <h2 className="text-sm font-medium">Apply to</h2>
      <div className="mt-3 grid gap-2">
        {EDIT_SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => onPick(scope)}
            className="rounded-2xl border border-line px-3.5 py-2.5 text-left text-[13px] transition-colors hover:border-accent hover:bg-surface-muted"
          >
            {SCOPE_LABELS[scope](noun, plural)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
      >
        Cancel
      </button>
    </div>
  );
}
