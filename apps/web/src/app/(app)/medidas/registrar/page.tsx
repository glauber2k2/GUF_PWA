import type { Metadata } from "next";
import { MeasurementRegisterScreen } from "@/features/body-measurements";

export const metadata: Metadata = {
  title: "Nova medição · Guf",
};

/** Nova medição: /medidas/registrar[?musculo=<músculo>]. */
export default function MeasurementRegisterPage() {
  return <MeasurementRegisterScreen />;
}
