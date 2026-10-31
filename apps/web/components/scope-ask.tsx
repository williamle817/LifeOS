"use client";

import { EDIT_SCOPES, type EditScope } from "@lifeos/contracts";
import { quiet } from "@/components/styles";

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
    <div className="p-5">
      <h2 className="font-display text-xl font-medium">Apply to</h2>
      <div className="mt-4 grid gap-2">
        {EDIT_SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => onPick(scope)}
            className="min-h-11 rounded-card bg-surface-muted px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent-soft hover:text-accent"
          >
            {SCOPE_LABELS[scope](noun, plural)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className={`mt-3 ${quiet}`}
      >
        Cancel
      </button>
    </div>
  );
}
