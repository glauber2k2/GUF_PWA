import { Dumbbell } from "lucide-react";
import { cardioActivityFor, setMetricKind } from "@guf/core";
import { Icon, MuscleIcon, muscleIconKey } from "@/shared/components/ds";
import { CARDIO_ACTIVITY_ICONS } from "@/shared/constants/cardio-activity-icons";

/** Ícone (aparelho ou halter) em relação ao quadro. */
const ICON_SCALE = 0.45;
/**
 * O músculo é desenhado maior que o quadro e o quadro corta as bordas (overflow-hidden em quem usa):
 * no tamanho exato a silhueta inteira cabia e a região trabalhada ficava pequena.
 */
const MUSCLE_SCALE = 1.45;

/**
 * Imagem do exercício (os exercícios ainda não têm foto): a imagem própria quando existe (o aparelho
 * no cardio), senão o músculo trabalhado em zoom; corpo inteiro, sem músculo desenhado, fica com o halter.
 * Quem usa dá o quadro (tamanho e `overflow-hidden`); `size` é o lado dele em px.
 */
export function ExerciseImage({ name, muscleGroup, size }: { name: string; muscleGroup: string; size: number }) {
  if (setMetricKind(muscleGroup) === "cardio") return <Icon icon={CARDIO_ACTIVITY_ICONS[cardioActivityFor(name).key]} size={Math.round(size * ICON_SCALE)} />;
  const muscle = muscleIconKey(muscleGroup);
  if (!muscle) return <Icon icon={Dumbbell} size={Math.round(size * ICON_SCALE)} />;
  const drawn = Math.round(size * MUSCLE_SCALE);
  return (
    // Margem negativa: a caixa ocupa só o quadro e o desenho maior fica centralizado nele (valor dinâmico).
    <span className="flex flex-none" style={{ margin: -(drawn - size) / 2 }}>
      <MuscleIcon muscle={muscle} zoom size={drawn} animate="none" label="" />
    </span>
  );
}
