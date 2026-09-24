export type IconName =
  | "dashboard"
  | "schedule"
  | "money"
  | "academic"
  | "fitness"
  | "assistant";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/schedule", label: "Schedule", icon: "schedule" },
  { href: "/money", label: "Money", icon: "money" },
  { href: "/academic", label: "Academic", icon: "academic" },
  { href: "/fitness", label: "Fitness", icon: "fitness" },
  { href: "/assistant", label: "Assistant", icon: "assistant" },
];
