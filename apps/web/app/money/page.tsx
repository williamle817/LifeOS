import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Money",
};

export default function MoneyPage() {
  return (
    <>
      <PageHeader
        title="Money"
        description="Income, estimated tax and spending. Work shifts and dining events from Schedule feed this automatically, and anything without a scheduled time can be entered by hand."
      />
      <EmptyState
        title="No income or spending recorded"
        body="Once you log a work shift or a meal in Schedule, the totals and the charts here fill in on their own."
        hint="Coming after the backend is in place."
      />
    </>
  );
}
