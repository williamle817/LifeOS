import { Nav } from "@/components/nav";
import { SignOut } from "@/components/sign-out";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-surface px-5 py-3 md:px-10">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="font-semibold tracking-tight">LifeOS</span>
      </div>
      <Nav />
      <SignOut />
    </header>
  );
}
