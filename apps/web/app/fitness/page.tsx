import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Fitness",
};

export default function FitnessPage() {
  return (
    <>
      <PageHeader
        title="Fitness"
        description="A history of your gym sessions and other exercise, built from the gym events you log in Schedule."
      />
      <EmptyState
        title="No sessions yet"
        body="Workout type, duration and calories burned show up here, with weekly and monthly summaries."
        hint="Coming after the backend is in place."
      />
    </>
  );
}
