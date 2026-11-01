export function Labeled({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-muted">{caption}</span>
      {children}
    </label>
  );
}
