import type { Metadata } from "next";
import { ScheduleView } from "@/modules/schedule/components/schedule-view";
import "./schedule.css";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function SchedulePage() {
  return <ScheduleView />;
}
