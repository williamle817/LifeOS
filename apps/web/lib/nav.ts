export type IconName =
  | "dashboard"
  | "schedule"
  | "academic"
  | "finance"
  | "fitness";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/schedule", label: "Schedule", icon: "schedule" },
  { href: "/academic", label: "Academic", icon: "academic" },
  { href: "/finance", label: "Finance", icon: "finance" },
  { href: "/fitness", label: "Fitness", icon: "fitness" },
];
