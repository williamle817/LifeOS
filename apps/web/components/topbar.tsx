import Link from "next/link";
import { Brand } from "@/components/brand";
import { Nav } from "@/components/nav";
import { SignOut } from "@/components/sign-out";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopBar() {
  return (
    <div className="sticky top-0 z-10 px-4 pt-4 md:px-6">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 rounded-[1.75rem] bg-surface py-2 pr-2 pl-5 shadow-float md:flex-nowrap md:gap-4 md:rounded-full">
        <Link href="/" aria-label="LifeOS home" className="mr-auto rounded-full md:mr-0">
          <Brand />
        </Link>
        <Nav />
        <ThemeToggle />
        <SignOut />
      </header>
    </div>
  );
}
