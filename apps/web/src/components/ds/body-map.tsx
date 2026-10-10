import { cloneElement, type ReactElement } from "react";
import { muscleGroupView } from "@guf/core";
import { cn } from "@/lib/utils";

/* Silhueta simples do corpo (grade 48×94), só em traço, com o grupo muscular destacado em volt. */

type Shape = ReactElement;

const BODY = {
  head: <circle cx={24} cy={9} r={6} />,
  torso: <rect x={13} y={18} width={22} height={33} rx={6} />,
  upperArmL: <rect x={6.5} y={20} width={5} height={17} rx={2.5} />,
  upperArmR: <rect x={36.5} y={20} width={5} height={17} rx={2.5} />,
  forearmL: <rect x={5.5} y={38.5} width={4.5} height={15} rx={2.25} />,
  forearmR: <rect x={38} y={38.5} width={4.5} height={15} rx={2.25} />,
  thighL: <rect x={14} y={53} width={9} height={20} rx={4.5} />,
  thighR: <rect x={25} y={53} width={9} height={20} rx={4.5} />,
  calfL: <rect x={15} y={74.5} width={7} height={18} rx={3.5} />,
  calfR: <rect x={26} y={74.5} width={7} height={18} rx={3.5} />,
} satisfies Record<string, Shape>;

const HIGHLIGHT: Record<string, Shape[]> = {
  peito: [<rect key="l" x={15.5} y={21} width={8} height={8} rx={3} />, <rect key="r" x={24.5} y={21} width={8} height={8} rx={3} />],
  costas: [<rect key="b" x={15.5} y={21} width={17} height={18} rx={5} />],
  ombros: [<circle key="l" cx={11.5} cy={22} r={3.6} />, <circle key="r" cx={36.5} cy={22} r={3.6} />],
  biceps: [BODY.upperArmL, BODY.upperArmR],
  triceps: [BODY.upperArmL, BODY.upperArmR],
  antebraco: [BODY.forearmL, BODY.forearmR],
  quadriceps: [BODY.thighL, BODY.thighR],
  posterior: [BODY.thighL, BODY.thighR],
  panturrilha: [BODY.calfL, BODY.calfR],
  gluteos: [<rect key="g" x={15} y={43} width={18} height={9} rx={4} />],
  abdomen: [<rect key="a" x={19} y={31} width={10} height={16} rx={3} />],
  corpo_inteiro: [
    BODY.torso,
    BODY.upperArmL,
    BODY.upperArmR,
    BODY.forearmL,
    BODY.forearmR,
    BODY.thighL,
    BODY.thighR,
    BODY.calfL,
    BODY.calfR,
  ],
  cardio: [<path key="c" d="M20 31 L15.6 26.6 A2.6 2.6 0 0 1 20 23.2 A2.6 2.6 0 0 1 24.4 26.6 Z" />],
};

export interface BodyMapProps {
  /** Código de exercises.muscle_group. */
  muscleGroup: string;
  className?: string;
}

/** Silhueta do corpo com o grupo muscular em destaque (vista de costas para costas, tríceps, posterior…). */
export function BodyMap({ muscleGroup, className }: BodyMapProps) {
  const back = muscleGroupView(muscleGroup) === "back";
  const base = Object.entries(BODY).map(([key, shape]) => cloneElement(shape, { key }));
  const highlight = (HIGHLIGHT[muscleGroup] ?? []).map((shape, i) => cloneElement(shape, { key: `h${i}` }));
  return (
    <svg viewBox="0 0 48 94" aria-hidden="true" className={cn("block h-[58px] w-[30px]", className)}>
      <g className="fill-none stroke-current" strokeWidth={1.6}>
        {base}
        {back && <line x1={24} y1={21} x2={24} y2={44} strokeDasharray="2 2" />}
      </g>
      <g className="fill-accent stroke-accent-text" strokeWidth={1.6}>
        {highlight}
      </g>
    </svg>
  );
}
