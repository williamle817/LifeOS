"use client";

import { useEffect } from "react";

export function Confirm({
  title,
  body,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/20"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-surface p-5 shadow-lg"
      >
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-2 text-[13px] text-ink-muted">{body}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              backgroundColor: "var(--event-red)",
              borderColor: "var(--event-red-line)",
              color: "var(--event-red-ink)",
            }}
            className="rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors hover:brightness-95"
          >
            {action}
          </button>
        </div>
      </div>
    </>
  );
}
