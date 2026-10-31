import Link from "next/link";
import { NavIcon } from "@/components/icons";
import { primary } from "@/components/styles";
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
      className="flex min-h-60 flex-col gap-4 rounded-panel bg-surface p-7 text-ink shadow-soft"
    >
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-[22px]">
          <NavIcon name={tone} />
        </span>
        <h2
          id={title}
          className="font-display text-[1.75rem] leading-tight font-medium"
        >
          {title}
        </h2>
      </div>
      {children}
      <Link href={href} className={`${primary} mt-auto min-h-11 self-start`}>
        Open {page}
      </Link>
    </section>
  );
}
