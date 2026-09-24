import { Nav } from "@/components/nav";

export function Sidebar() {
  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-5 py-4 md:px-6 md:py-6">
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="font-semibold tracking-tight">LifeOS</span>
      </div>
      <Nav />
    </aside>
  );
}
