import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Academic",
};

export default function AcademicPage() {
  return (
    <>
      <PageHeader
        title="Academic"
        description="Courses and how each one is graded. Enter a score and LifeOS works out your current grade and how much of the course has been graded so far."
      />
      <EmptyState
        title="No courses yet"
        body="Add a course, define its grading categories and their weights, then let exam events in Schedule keep the grade current."
        hint="Coming after the backend is in place."
      />
    </>
  );
}
