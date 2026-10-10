import type { Metadata } from "next";
import { AcademicView } from "@/modules/academic/components/academic-view";
import "./academic.css";

export const metadata: Metadata = {
  title: "Academic",
};

export default function AcademicPage() {
  return <AcademicView />;
}
