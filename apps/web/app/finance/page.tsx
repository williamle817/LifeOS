import type { Metadata } from "next";
import { Theme } from "@/components/theme";
import { FinanceView } from "@/modules/finance/components/finance-view";

export const metadata: Metadata = {
  title: "Finance",
};

export default function FinancePage() {
  return (
    <>
      <Theme name="slate" />
      <FinanceView />
    </>
  );
}
