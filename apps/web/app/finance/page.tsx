import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Finance",
};

export default function FinancePage() {
  return (
    <EmptyState
      title="No income or spending recorded"
      body="Once you log a work shift or a meal in Schedule, the totals and the charts here fill in on their own."
      hint="Coming after the backend is in place."
    />
  );
}
