import type { Metadata } from "next";
import { FinanceView } from "@/modules/finance/components/finance-view";

export const metadata: Metadata = {
  title: "Finance",
};

export default function FinancePage() {
  return <FinanceView />;
}
