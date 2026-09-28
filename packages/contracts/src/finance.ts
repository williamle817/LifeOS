import type { Money } from "./event";

export const FLOW_KINDS = ["income", "expense"] as const;

export type FlowKind = (typeof FLOW_KINDS)[number];

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

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const INCOME_TYPES = [
  "Paycheck",
  "Tips",
  "Side job",
  "Gift",
  "Refund",
  "Other",
] as const;

export type IncomeType = (typeof INCOME_TYPES)[number];

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
