import type { Metadata } from "next";
import { ScheduleView } from "@/modules/schedule/components/schedule-view";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function SchedulePage() {
  return (
    <ScheduleView />
  );
}
