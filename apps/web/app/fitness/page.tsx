import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Fitness",
};

export default function FitnessPage() {
  return (
    <EmptyState
      title="No sessions yet"
      body="Workout type, duration and calories burned show up here, with weekly and monthly summaries."
      hint="Coming after the backend is in place."
    />
  );
}
