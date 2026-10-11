export function SaveError({
  message,
  className = "",
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      className={`rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-muted ${className}`}
    >
      Could not save: {message}
    </p>
  );
}
