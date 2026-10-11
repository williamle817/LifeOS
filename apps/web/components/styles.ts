export const primary =
  "rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-surface shadow-sm transition-colors hover:brightness-110";

export const quiet =
  "rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-muted";

export const quietOnMuted =
  "rounded-full px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface";

export const input =
  "rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-accent";

export const inputSmall =
  "rounded-xl border border-line bg-surface px-2.5 py-1 text-[13px] outline-none transition-colors focus:border-accent";

export function tint(color: string): React.CSSProperties {
  return {
    backgroundColor: `var(--event-${color})`,
    borderColor: `var(--event-${color}-line)`,
    color: `var(--event-${color}-ink)`,
  };
}
