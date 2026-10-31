"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/icons";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="order-last flex min-w-0 basis-full gap-1 overflow-x-auto md:order-none md:flex-1 md:basis-auto">
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
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
              active
                ? "bg-accent-soft font-semibold text-accent"
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
