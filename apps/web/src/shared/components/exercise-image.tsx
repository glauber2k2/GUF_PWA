import { Dumbbell } from "lucide-react";
import { cardioActivityFor, setMetricKind } from "@guf/core";
import { Icon, MuscleIcon, muscleIconKey } from "@/shared/components/ds";
import { CARDIO_ACTIVITY_ICONS } from "@/shared/constants/cardio-activity-icons";

/**
 * Imagem do exercício (os exercícios ainda não têm foto): a imagem própria quando existe (o aparelho
 * no cardio), senão o músculo trabalhado em zoom; corpo inteiro, sem músculo desenhado, fica com o halter.
 */
export function ExerciseImage({ name, muscleGroup, size }: { name: string; muscleGroup: string; size: number }) {
  if (setMetricKind(muscleGroup) === "cardio") return <Icon icon={CARDIO_ACTIVITY_ICONS[cardioActivityFor(name).key]} size={Math.round(size * 0.45)} />;
  const muscle = muscleIconKey(muscleGroup);
  if (!muscle) return <Icon icon={Dumbbell} size={Math.round(size * 0.45)} />;
  return <MuscleIcon muscle={muscle} zoom size={size} animate="none" label="" />;
}
