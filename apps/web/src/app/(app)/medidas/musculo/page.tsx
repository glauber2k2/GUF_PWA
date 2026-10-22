import type { Metadata } from "next";
import { MeasurementPartScreen } from "@/features/body-measurements";

export const metadata: Metadata = {
  title: "Medidas corporais · Guf",
};

/** Evolução de um músculo: /medidas/musculo?id=<músculo> (rota fixa com query string). */
export default function MeasurementPartPage() {
  return <MeasurementPartScreen />;
}
