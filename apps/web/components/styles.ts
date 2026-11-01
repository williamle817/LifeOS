export const primary =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-surface shadow-float transition hover:brightness-110 active:scale-[0.98]";

export const quiet =
  "inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

export const quietOnMuted =
  "inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink";

export const soft =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-surface-muted px-5 text-sm font-medium text-ink transition-colors hover:brightness-95";

export const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink";

export const input =
  "min-h-11 rounded-field border border-line bg-canvas px-3.5 text-sm outline-none transition-colors focus:border-accent";

export const inputSmall =
  "min-h-10 rounded-full border border-line bg-canvas px-3.5 text-[13px] outline-none transition-colors focus:border-accent";

export function tint(color: string): React.CSSProperties {
  return {
    backgroundColor: `var(--event-${color})`,
    borderColor: `var(--event-${color}-line)`,
    color: `var(--event-${color}-ink)`,
  };
}
