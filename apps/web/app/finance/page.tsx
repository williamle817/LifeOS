import type { Metadata } from "next";
import { FinanceView } from "@/modules/finance/components/finance-view";
import "./finance.css";

export const metadata: Metadata = {
  title: "Finance",
};

export default function FinancePage() {
  return <FinanceView />;
}
