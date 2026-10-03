"use client";

import { Modal } from "@/components/modal";

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
  return (
    <Modal label={title} onClose={onCancel}>
      <div className="p-5">
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
    </Modal>
  );
}
