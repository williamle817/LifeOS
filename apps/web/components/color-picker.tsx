"use client";

import { EVENT_COLORS, type EventColor } from "@lifeos/contracts";

export function ColorPicker({
  value,
  onChange,
}: {
  value: EventColor;
  onChange: (color: EventColor) => void;
}) {
  return (
    <div className="mt-1 flex gap-2">
      {EVENT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
          style={{
            backgroundColor: `var(--event-${color})`,
            borderColor:
              value === color
                ? `var(--event-${color}-ink)`
                : `var(--event-${color}-line)`,
          }}
          className={`size-6 rounded-full transition-all ${
            value === color ? "border-2" : "border"
          }`}
        />
      ))}
    </div>
  );
}
