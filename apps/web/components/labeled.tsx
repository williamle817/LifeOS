export function Labeled({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-ink-faint">{caption}</span>
      {children}
    </label>
  );
}
