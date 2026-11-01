import type { Metadata } from "next";
import { FitnessView } from "@/modules/fitness/components/fitness-view";
import "./fitness.css";

export const metadata: Metadata = {
  title: "Fitness",
};

export default function FitnessPage() {
  return <FitnessView />;
}
