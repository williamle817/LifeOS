export const EVENT_TYPES = [
  "general",
  "work",
  "gym",
  "dining",
  "class",
  "exam",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_COLORS = [
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "slate",
] as const;

export type EventColor = (typeof EVENT_COLORS)[number];
export type IsoDateTime = string;
export type Money = number;

type EventBase = {
  id: string;
  title: string;
  start: IsoDateTime;
  end: IsoDateTime;
  allDay?: boolean;
  color?: EventColor;
  notes?: string;
};

export type GeneralEvent = EventBase & {
  type: "general";
};

export type WorkEvent = EventBase & {
  type: "work";
  tips?: Money;
};

export type GymEvent = EventBase & {
  type: "gym";
  workout: string;
  calories?: number;
};

export type DiningEvent = EventBase & {
  type: "dining";
  place: string;
  amount: Money;
};

export type ClassEvent = EventBase & {
  type: "class";
  course: string;
};

export type ExamEvent = EventBase & {
  type: "exam";
  course: string;
  score?: number;
  maxScore: number;
};

export type LifeEvent =
  | GeneralEvent
  | WorkEvent
  | GymEvent
  | DiningEvent
  | ClassEvent
  | ExamEvent;
