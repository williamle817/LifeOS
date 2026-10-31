export function Brand({ size = "base" }: { size?: "base" | "large" }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 32 20"
        aria-hidden="true"
        className={size === "large" ? "h-6 w-[38px]" : "h-5 w-8"}
      >
        <circle
          cx="11"
          cy="10"
          r="7"
          fill="none"
          strokeWidth="2.5"
          className="stroke-accent opacity-45"
        />
        <circle
          cx="21"
          cy="10"
          r="7"
          fill="none"
          strokeWidth="2.5"
          className="stroke-accent"
        />
      </svg>
      <span
        className={`font-display font-semibold tracking-tight ${
          size === "large" ? "text-2xl" : "text-xl"
        }`}
      >
        LifeOS
      </span>
    </span>
  );
}
