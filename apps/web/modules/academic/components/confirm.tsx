"use client";

import { Modal } from "@/components/modal";
import { quiet, tint } from "@/components/styles";

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
      <div className="p-6">
        <h2 className="font-display text-2xl font-medium">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={quiet}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={tint("red")}
            className="min-h-10 rounded-full border px-5 text-sm font-semibold transition hover:brightness-95"
          >
            {action}
          </button>
        </div>
      </div>
    </Modal>
  );
}
