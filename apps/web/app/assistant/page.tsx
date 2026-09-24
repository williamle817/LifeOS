import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Assistant",
};

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Assistant"
        description="Ask about your schedule, money, courses and workouts in plain language, and let it make changes for you."
      />
      <EmptyState
        title="Not connected yet"
        body="Questions like how much did I spend this month, or add gym tomorrow at 6, will be answered here against your real data."
        hint="Coming once the modules have data to read."
      />
    </>
  );
}
