import { NavIcon } from "@/components/icons";
import type { IconName } from "@/lib/nav";

export function EmptyState({
  icon,
  title,
  body,
  hint,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="empty-title"
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-[2rem] bg-surface px-6 py-14 text-center shadow-soft sm:px-10"
    >
      <span className="grid size-20 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-9">
        <NavIcon name={icon} />
      </span>
      <h1
        id="empty-title"
        className="mt-1 font-display text-4xl font-medium tracking-tight sm:text-5xl"
      >
        {title}
      </h1>
      <p className="max-w-md text-base leading-relaxed text-ink-muted">{body}</p>
      {children}
      {hint ? <p className="mt-1 text-[13px] text-ink-faint">{hint}</p> : null}
    </section>
  );
}
