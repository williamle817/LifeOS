export function EmptyState({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{body}</p>
      {hint ? <p className="mt-4 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
