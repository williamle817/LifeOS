import type { Money } from "./event";

export const FLOW_KINDS = ["income", "expense"] as const;

export type FlowKind = (typeof FLOW_KINDS)[number];

export const FLOW_REPEATS = ["once", "monthly", "yearly"] as const;

export type FlowRepeat = (typeof FLOW_REPEATS)[number];

export type Flow = {
  id: string;
  userId: string;
  kind: FlowKind;
  title: string;
  place?: string;
  on: string;
  amount: Money;
  repeat: FlowRepeat;
  eventId?: string;
  position?: number;
};
