import { Activity, Bike, Footprints, Waves, type LucideIcon } from "lucide-react";
import type { CardioActivityKey } from "@guf/core";

/** Ícone de cada aparelho de cardio (catálogo em packages/core/src/cardio.ts). */
export const CARDIO_ACTIVITY_ICONS: Record<CardioActivityKey, LucideIcon> = {
  treadmill: Footprints,
  bike: Bike,
  rower: Waves,
  elliptical: Activity,
  generic: Activity,
};
