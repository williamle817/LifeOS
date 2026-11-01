"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { useSignedIn } from "@/lib/signed-in";
import { NavIcon } from "@/components/icons";

export function Nav() {
  const pathname = usePathname();
  const signedIn = useSignedIn();

  if (!signedIn) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-line bg-surface px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:static md:z-auto md:min-w-0 md:flex-1 md:border-0 md:bg-transparent md:p-0">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition-colors md:min-h-11 md:flex-none md:shrink-0 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm [&_svg]:size-5 md:[&_svg]:size-4 ${
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
