import Link from "next/link";
import { ActionIcon, NavIcon } from "@/components/icons";
import type { IconName } from "@/lib/nav";

export const SHOWN = 5;

export function More({ count }: { count: number }) {
  if (count <= 0) return null;
  return <p className="text-xs font-medium text-ink-muted">and {count} more</p>;
}

export function Panel({
  tone,
  title,
  page,
  href,
  children,
}: {
  tone: IconName;
  title: string;
  page: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-tone={tone}
      aria-labelledby={title}
      className="relative flex min-h-60 flex-col gap-4 rounded-panel bg-surface p-7 text-ink shadow-soft transition-shadow hover:shadow-pop"
    >
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-[22px]">
          <NavIcon name={tone} />
        </span>
        <h2
          id={title}
          className="min-w-0 font-display text-[1.75rem] leading-tight font-medium break-words"
        >
          {title}
        </h2>
        <Link
          href={href}
          aria-label={`Open ${page}`}
          className="ml-auto flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-full bg-accent-soft text-sm font-semibold text-accent transition hover:brightness-95 after:absolute after:inset-0 after:rounded-panel sm:pr-3 sm:pl-4"
        >
          <span className="hidden sm:inline">{page}</span>
          <ActionIcon name="forward" />
        </Link>
      </div>
      {children}
    </section>
  );
}
