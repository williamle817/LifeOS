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
      className={`rounded-card bg-surface px-5 py-3 text-sm text-ink-muted shadow-soft ${className}`}
    >
      Could not save: {message}
    </p>
  );
}
