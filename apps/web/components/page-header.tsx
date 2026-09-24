export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
        {title}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>
    </header>
  );
}
