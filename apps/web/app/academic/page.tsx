import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Academic",
};

export default function AcademicPage() {
  return (
    <EmptyState
      title="No courses yet"
      body="Add a course, define its grading categories and their weights, then let exam events in Schedule keep the grade current."
      hint="Coming after the backend is in place."
    />
  );
}
