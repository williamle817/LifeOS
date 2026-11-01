import type { Money } from "./event";

export type FlowKind = "income" | "expense";

export const FLOW_REPEATS = ["once", "monthly", "yearly"] as const;

export type FlowRepeat = (typeof FLOW_REPEATS)[number];

export const EXPENSE_TYPES = [
  "Groceries",
  "Dining out",
  "Going out",
  "Subscription",
  "Transport",
  "Housing",
  "Health",
  "Shopping",
  "Other",
] as const;

export const INCOME_TYPES = [
  "Work",
  "Paycheck",
  "Tips",
  "Side job",
  "Gift",
  "Refund",
  "Other",
] as const;

export type Flow = {
  id: string;
  userId: string;
  kind: FlowKind;
  title: string;
  place?: string;
  category?: string;
  on: string;
  amount: Money;
  repeat: FlowRepeat;
  until?: string;
  skips?: string[];
  eventId?: string;
  position?: number;
};
