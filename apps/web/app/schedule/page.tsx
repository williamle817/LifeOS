import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        title="Schedule"
        description="The entry point for everything you do. Log a shift, a class, a workout or a meal once here, and Money, Academic and Fitness update themselves."
      />
      <EmptyState
        title="No events yet"
        body="Day, week and month views live here, with a form that changes depending on the type of event you are adding."
        hint="Coming in the next phase."
      />
    </>
  );
}
