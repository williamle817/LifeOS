import type { Course } from "@lifeos/contracts";
import { show } from "@/modules/academic/lib/grade";

export function GradeTrack({
  course,
  banked,
  ceiling,
}: {
  course: Course;
  banked: number;
  ceiling: number;
}) {
  const color = course.color ?? "blue";
  const earned = Math.min(100, Math.max(0, banked));
  const reach = Math.min(100, Math.max(earned, ceiling));
  const cutoffs = course.scale.filter((step) => step.min > 0 && step.min < 100);
  const solid = { backgroundColor: `var(--event-${color}-line)` };
  const open = {
    backgroundColor: `var(--event-${color})`,
    backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, var(--event-${color}-line) 45%, transparent) 0 6px, transparent 6px 12px)`,
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${show(earned)} of 100 points earned, up to ${show(reach)} still possible`}
        className="relative h-4 overflow-hidden rounded-full bg-surface-muted"
      >
        <span
          className="absolute inset-y-0 left-0"
          style={{ ...open, width: `${reach}%` }}
        />
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ ...solid, width: `${earned}%` }}
        />
        {cutoffs.map((step) => (
          <span
            key={step.letter}
            className="absolute inset-y-0 w-0.5 bg-ink/25"
            style={{ left: `${step.min}%` }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="relative h-4 text-[11px] font-semibold text-ink-faint"
      >
        <span className="absolute left-0">0</span>
        {cutoffs.map((step) => (
          <span
            key={step.letter}
            className="absolute -translate-x-1/2"
            style={{ left: `${step.min}%` }}
          >
            {step.letter}
          </span>
        ))}
        <span className="absolute right-0">100</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full" style={solid} />
          Earned {show(earned)}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full" style={open} />
          Still possible, up to {show(reach)}
        </span>
      </div>
    </div>
  );
}
