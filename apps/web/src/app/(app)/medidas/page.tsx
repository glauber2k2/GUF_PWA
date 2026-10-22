import type { Metadata } from "next";
import { MeasurementsScreen } from "@/features/body-measurements";

export const metadata: Metadata = {
  title: "Medidas corporais · Guf",
};

/** Medidas corporais (só a própria pessoa): autorização na primeira vez e a lista por músculo. */
export default function MeasurementsPage() {
  return <MeasurementsScreen />;
}
