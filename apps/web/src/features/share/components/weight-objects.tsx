// Objetos das comparações de peso (Claude Design · Comparacoes de Peso). Desenhos convertidos do
// design (SVG) com as cores da paleta das ilustrações (tokens --color-art-* do @theme).
import type { ReactNode } from "react";
import type { WeightObjectKind } from "@guf/core";

const OBJECTS: Record<WeightObjectKind, { viewBox: string; art: ReactNode }> = {
  barra: {
    viewBox: "0 0 220 60",
    art: (
      <>
        <rect x={4} y={27} width={212} height={6} rx={3} className="fill-art-metal-1" />
        <path d="M80 27V33M88 27V33M96 27V33M124 27V33M132 27V33M140 27V33" strokeWidth={2} className="stroke-art-metal-2" />
        <rect x={18} y={4} width={15} height={52} rx={4} className="fill-art-blue" />
        <rect x={35} y={10} width={10} height={40} rx={3} className="fill-art-volt" />
        <rect x={47} y={21} width={7} height={18} rx={2} className="fill-art-metal-2" />
        <rect x={187} y={4} width={15} height={52} rx={4} className="fill-art-blue" />
        <rect x={175} y={10} width={10} height={40} rx={3} className="fill-art-volt" />
        <rect x={166} y={21} width={7} height={18} rx={2} className="fill-art-metal-2" />
        <rect x={21} y={8} width={3} height={40} rx={1.5} opacity={0.35} className="fill-art-white" />
        <rect x={190} y={8} width={3} height={40} rx={1.5} opacity={0.35} className="fill-art-white" />
      </>
    ),
  },
  saco: {
    viewBox: "0 0 100 172",
    art: (
      <>
        <path d="M50 4L28 42M50 4L72 42M50 4V42" strokeWidth={3} strokeLinecap="round" className="stroke-art-metal-1" />
        <circle cx={50} cy={5} r={5} className="fill-art-metal-2" />
        <rect x={20} y={38} width={60} height={128} rx={22} className="fill-art-red" />
        <ellipse cx={50} cy={42} rx={28} ry={7} className="fill-art-metal-3" />
        <rect x={20} y={92} width={60} height={18} className="fill-art-volt" />
        <rect x={20} y={62} width={60} height={5} opacity={0.25} className="fill-art-ink" />
        <rect x={20} y={138} width={60} height={5} opacity={0.25} className="fill-art-ink" />
        <rect x={28} y={50} width={8} height={104} rx={4} opacity={0.3} className="fill-art-white" />
      </>
    ),
  },
  lavar: {
    viewBox: "0 0 124 134",
    art: (
      <>
        <rect x={6} y={6} width={112} height={120} rx={14} className="fill-art-white-2" />
        <path d="M6 32V20A14 14 0 0 1 20 6H104A14 14 0 0 1 118 20V32Z" className="fill-art-white" />
        <rect x={18} y={12} width={40} height={13} rx={4} className="fill-art-metal-3" />
        <rect x={22} y={16} width={16} height={5} rx={2} className="fill-art-volt" />
        <circle cx={98} cy={19} r={7} className="fill-art-metal-2" />
        <circle cx={80} cy={19} r={4} className="fill-art-metal-1" />
        <circle cx={62} cy={80} r={38} className="fill-art-metal-2" />
        <circle cx={62} cy={80} r={30} className="fill-art-blue-deep" />
        <path d="M33 84Q47 74 62 84T91 84V90A30 30 0 0 1 33 90Z" className="fill-art-blue" />
        <circle cx={52} cy={90} r={5} className="fill-art-volt" />
        <circle cx={70} cy={94} r={4} className="fill-art-red" />
        <path
          d="M44 62A24 24 0 0 1 64 54"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.6}
          fill="none"
          className="stroke-art-white"
        />
        <rect x={18} y={124} width={16} height={6} rx={2} className="fill-art-metal-3" />
        <rect x={90} y={124} width={16} height={6} rx={2} className="fill-art-metal-3" />
      </>
    ),
  },
  geladeira: {
    viewBox: "0 0 92 174",
    art: (
      <>
        <rect x={6} y={4} width={80} height={162} rx={14} className="fill-art-white" />
        <rect x={60} y={4} width={26} height={162} rx={12} className="fill-art-white-2" />
        <rect x={6} y={60} width={80} height={4} className="fill-art-metal-1" />
        <rect x={68} y={20} width={6} height={30} rx={3} className="fill-art-metal-2" />
        <rect x={68} y={74} width={6} height={44} rx={3} className="fill-art-metal-2" />
        <circle cx={24} cy={24} r={6} className="fill-art-volt" />
        <rect x={30} y={86} width={16} height={12} rx={2} transform="rotate(-8 38 92)" className="fill-art-gold" />
        <rect x={18} y={104} width={14} height={10} rx={2} transform="rotate(6 25 109)" className="fill-art-blue" />
        <rect x={14} y={164} width={14} height={7} rx={2} className="fill-art-metal-3" />
        <rect x={64} y={164} width={14} height={7} rx={2} className="fill-art-metal-3" />
      </>
    ),
  },
  moto: {
    viewBox: "0 0 224 124",
    art: (
      <>
        <circle cx={46} cy={92} r={28} className="fill-art-ink" />
        <circle cx={46} cy={92} r={21.84} className="fill-art-metal-3" />
        <circle cx={46} cy={92} r={12.6} className="fill-art-metal-1" />
        <circle cx={46} cy={92} r={4.2} className="fill-art-metal-3" />
        <circle cx={178} cy={92} r={28} className="fill-art-ink" />
        <circle cx={178} cy={92} r={21.84} className="fill-art-metal-3" />
        <circle cx={178} cy={92} r={12.6} className="fill-art-metal-1" />
        <circle cx={178} cy={92} r={4.2} className="fill-art-metal-3" />
        <path d="M46 92L100 78" strokeWidth={7} strokeLinecap="round" className="stroke-art-metal-2" />
        <path d="M178 92L166 46" strokeWidth={7} strokeLinecap="round" className="stroke-art-metal-1" />
        <rect x={60} y={72} width={44} height={8} rx={4} transform="rotate(-8 82 76)" className="fill-art-metal-1" />
        <path d="M36 70L78 52L118 50L148 30L184 38L198 64L172 72L134 82L92 84Z" className="fill-art-volt" />
        <path d="M78 52Q98 36 126 46L118 54Z" className="fill-art-metal-3" />
        <path d="M148 30L160 14L172 20L170 34Z" className="fill-art-blue" />
        <path d="M100 62H160" strokeWidth={3} opacity={0.3} strokeLinecap="round" className="stroke-art-ink" />
        <circle cx={188} cy={52} r={6} className="fill-art-white" />
        <rect x={104} y={66} width={34} height={14} rx={5} className="fill-art-metal-3" />
      </>
    ),
  },
  tigre: {
    viewBox: "0 0 210 128",
    art: (
      <>
        <path d="M38 60Q8 50 14 24" strokeWidth={9} strokeLinecap="round" fill="none" className="stroke-art-orange" />
        <path d="M15 34L22 30M13 44L21 42" strokeWidth={4} strokeLinecap="round" className="stroke-art-ink" />
        <rect x={52} y={76} width={18} height={44} rx={7.5} className="fill-art-orange" />
        <rect x={52} y={113} width={18} height={8} rx={3} className="fill-art-white" />
        <rect x={80} y={80} width={18} height={40} rx={7.5} className="fill-art-orange" />
        <rect x={80} y={113} width={18} height={8} rx={3} className="fill-art-white" />
        <rect x={126} y={80} width={18} height={40} rx={7.5} className="fill-art-orange" />
        <rect x={126} y={113} width={18} height={8} rx={3} className="fill-art-white" />
        <rect x={150} y={76} width={18} height={44} rx={7.5} className="fill-art-orange" />
        <rect x={150} y={113} width={18} height={8} rx={3} className="fill-art-white" />
        <ellipse cx={102} cy={68} rx={72} ry={34} className="fill-art-orange" />
        <ellipse cx={104} cy={84} rx={54} ry={16} className="fill-art-white" />
        <path
          d="M70 38Q74 54 66 66M92 36Q96 52 90 64M116 36Q120 52 114 64M138 38Q142 52 136 62"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          className="stroke-art-ink"
        />
        <circle cx={176} cy={28} r={9} className="fill-art-orange" />
        <circle cx={176} cy={28} r={4} className="fill-art-pink" />
        <circle cx={200} cy={30} r={9} className="fill-art-orange" />
        <circle cx={200} cy={30} r={4} className="fill-art-pink" />
        <circle cx={186} cy={52} r={27} className="fill-art-orange" />
        <ellipse cx={190} cy={64} rx={15} ry={11} className="fill-art-white" />
        <path d="M170 40L176 46M204 40L198 46M186 28V36" strokeWidth={3.5} strokeLinecap="round" className="stroke-art-ink" />
        <circle cx={178} cy={50} r={3} className="fill-art-ink" />
        <circle cx={179.05} cy={48.95} r={1.0499999999999998} className="fill-art-white" />
        <circle cx={198} cy={50} r={3} className="fill-art-ink" />
        <circle cx={199.05} cy={48.95} r={1.0499999999999998} className="fill-art-white" />
        <path d="M186 58H194L190 63Z" className="fill-art-pink" />
        <path d="M184 67Q190 71 196 67" strokeWidth={2.5} fill="none" strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  piano: {
    viewBox: "0 0 204 140",
    art: (
      <>
        <path d="M24 42L150 8L158 22L66 42Z" strokeWidth={2} className="fill-art-metal-3 stroke-art-metal-2" />
        <path d="M118 18V42" strokeWidth={3} className="stroke-art-metal-2" />
        <path d="M10 42H124Q194 42 194 74Q194 100 150 100H10Z" strokeWidth={2} className="fill-art-metal-3 stroke-art-metal-2" />
        <path
          d="M20 52H120Q176 52 180 74"
          strokeWidth={3}
          opacity={0.25}
          fill="none"
          strokeLinecap="round"
          className="stroke-art-white"
        />
        <rect x={8} y={88} width={66} height={14} rx={2} className="fill-art-white" />
        <path d="M17 88V97M26 88V97M40 88V97M49 88V97M58 88V97" strokeWidth={4} className="stroke-art-ink" />
        <rect x={18} y={100} width={9} height={34} rx={3} strokeWidth={2} className="fill-art-metal-3 stroke-art-metal-2" />
        <rect x={150} y={100} width={9} height={34} rx={3} strokeWidth={2} className="fill-art-metal-3 stroke-art-metal-2" />
        <rect x={92} y={100} width={6} height={22} className="fill-art-metal-3" />
        <rect x={86} y={120} width={18} height={5} rx={2} className="fill-art-gold" />
      </>
    ),
  },
  cavalo: {
    viewBox: "0 0 210 150",
    art: (
      <>
        <path d="M42 62Q14 66 18 104" strokeWidth={12} strokeLinecap="round" fill="none" className="stroke-art-brown-dark" />
        <rect x={52} y={76} width={15} height={66} rx={6.25} className="fill-art-brown" />
        <rect x={52} y={135} width={15} height={8} rx={3} className="fill-art-ink" />
        <rect x={74} y={80} width={15} height={62} rx={6.25} className="fill-art-brown" />
        <rect x={74} y={135} width={15} height={8} rx={3} className="fill-art-ink" />
        <rect x={128} y={80} width={15} height={62} rx={6.25} className="fill-art-brown" />
        <rect x={128} y={135} width={15} height={8} rx={3} className="fill-art-ink" />
        <rect x={150} y={76} width={15} height={66} rx={6.25} className="fill-art-brown" />
        <rect x={150} y={135} width={15} height={8} rx={3} className="fill-art-ink" />
        <ellipse cx={100} cy={72} rx={64} ry={30} className="fill-art-brown" />
        <path d="M138 62L162 18L186 30L164 76Z" className="fill-art-brown" />
        <path d="M156 14Q140 30 140 60L150 58Q150 34 166 18Z" className="fill-art-brown-dark" />
        <ellipse cx={184} cy={36} rx={22} ry={13} transform="rotate(28 184 36)" className="fill-art-brown" />
        <ellipse cx={198} cy={46} rx={9} ry={7} className="fill-art-brown-dark" />
        <path d="M168 16L170 4L178 16Z" className="fill-art-brown" />
        <circle cx={178} cy={28} r={3} className="fill-art-ink" />
        <circle cx={179.05} cy={26.95} r={1.0499999999999998} className="fill-art-white" />
        <circle cx={200} cy={46} r={2} className="fill-art-ink" />
        <path
          d="M60 58Q100 48 136 60"
          strokeWidth={3}
          opacity={0.2}
          fill="none"
          strokeLinecap="round"
          className="stroke-art-white"
        />
      </>
    ),
  },
  touro: {
    viewBox: "0 0 210 136",
    art: (
      <>
        <path d="M34 60Q12 64 16 96" strokeWidth={6} strokeLinecap="round" fill="none" className="stroke-art-metal-3" />
        <circle cx={16} cy={98} r={6} className="fill-art-ink" />
        <rect x={50} y={74} width={18} height={56} rx={7.5} className="fill-art-metal-3" />
        <rect x={50} y={123} width={18} height={8} rx={3} className="fill-art-ink" />
        <rect x={76} y={80} width={18} height={50} rx={7.5} className="fill-art-metal-3" />
        <rect x={76} y={123} width={18} height={8} rx={3} className="fill-art-ink" />
        <rect x={126} y={80} width={18} height={50} rx={7.5} className="fill-art-metal-3" />
        <rect x={126} y={123} width={18} height={8} rx={3} className="fill-art-ink" />
        <rect x={150} y={74} width={18} height={56} rx={7.5} className="fill-art-metal-3" />
        <rect x={150} y={123} width={18} height={8} rx={3} className="fill-art-ink" />
        <path
          d="M30 70Q30 38 70 36Q100 22 130 32Q170 36 170 70Q170 96 100 96Q30 96 30 70Z"
          strokeWidth={2}
          className="fill-art-metal-3 stroke-art-metal-2"
        />
        <path d="M150 38Q156 14 182 18Q170 22 166 40Z" className="fill-art-white-2" />
        <path d="M196 40Q206 16 186 10Q196 20 188 40Z" className="fill-art-white-2" />
        <circle cx={178} cy={56} r={26} strokeWidth={2} className="fill-art-metal-3 stroke-art-metal-2" />
        <ellipse cx={182} cy={72} rx={18} ry={12} className="fill-art-pink" />
        <circle cx={176} cy={72} r={2.5} className="fill-art-ink" />
        <circle cx={188} cy={72} r={2.5} className="fill-art-ink" />
        <path d="M174 82A8 8 0 0 0 190 82" strokeWidth={3.5} fill="none" className="stroke-art-gold" />
        <circle cx={170} cy={50} r={3.4} className="fill-art-ink" />
        <circle cx={171.19} cy={48.81} r={1.19} className="fill-art-white" />
        <circle cx={190} cy={50} r={3.4} className="fill-art-ink" />
        <circle cx={191.19} cy={48.81} r={1.19} className="fill-art-white" />
        <path d="M164 42L176 46M196 42L184 46" strokeWidth={3} strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  carro: {
    viewBox: "0 0 210 116",
    art: (
      <>
        <path
          d="M14 84V64Q14 54 26 52L56 48L82 22Q88 16 98 16H140Q152 16 160 26L178 50Q198 54 198 70V84Z"
          className="fill-art-blue"
        />
        <path d="M66 50L88 26H116V50Z" opacity={0.85} className="fill-art-white" />
        <path d="M124 26H140Q146 26 150 32L162 50H124Z" opacity={0.85} className="fill-art-white" />
        <path d="M120 22V84" strokeWidth={2.5} opacity={0.35} className="stroke-art-ink" />
        <rect x={100} y={58} width={14} height={4} rx={2} opacity={0.4} className="fill-art-ink" />
        <rect x={186} y={58} width={12} height={8} rx={3} className="fill-art-gold" />
        <rect x={12} y={60} width={10} height={8} rx={3} className="fill-art-red" />
        <rect x={12} y={78} width={188} height={8} rx={4} className="fill-art-metal-3" />
        <circle cx={52} cy={88} r={20} className="fill-art-ink" />
        <circle cx={52} cy={88} r={15.600000000000001} className="fill-art-metal-3" />
        <circle cx={52} cy={88} r={9} className="fill-art-metal-1" />
        <circle cx={52} cy={88} r={3} className="fill-art-metal-3" />
        <circle cx={162} cy={88} r={20} className="fill-art-ink" />
        <circle cx={162} cy={88} r={15.600000000000001} className="fill-art-metal-3" />
        <circle cx={162} cy={88} r={9} className="fill-art-metal-1" />
        <circle cx={162} cy={88} r={3} className="fill-art-metal-3" />
      </>
    ),
  },
  suv: {
    viewBox: "0 0 226 128",
    art: (
      <>
        <rect x={62} y={6} width={104} height={6} rx={3} className="fill-art-metal-2" />
        <path d="M70 12V18M156 12V18" strokeWidth={4} className="stroke-art-metal-2" />
        <path
          d="M10 92V66Q10 56 22 54L50 50L66 20Q70 14 80 14H168Q178 14 184 22L204 52Q216 56 216 70V92Z"
          className="fill-art-metal-1"
        />
        <path d="M60 52L74 24H118V52Z" className="fill-art-blue-deep" />
        <path d="M126 24H166Q172 24 176 30L190 52H126Z" className="fill-art-blue-deep" />
        <path d="M122 18V92" strokeWidth={2.5} opacity={0.35} className="stroke-art-ink" />
        <rect x={10} y={68} width={206} height={8} className="fill-art-volt" />
        <rect x={202} y={56} width={12} height={9} rx={3} className="fill-art-gold" />
        <rect x={8} y={84} width={210} height={10} rx={5} className="fill-art-metal-3" />
        <circle cx={56} cy={96} r={24} className="fill-art-ink" />
        <circle cx={56} cy={96} r={18.72} className="fill-art-metal-3" />
        <circle cx={56} cy={96} r={10.8} className="fill-art-metal-1" />
        <circle cx={56} cy={96} r={3.5999999999999996} className="fill-art-metal-3" />
        <circle cx={178} cy={96} r={24} className="fill-art-ink" />
        <circle cx={178} cy={96} r={18.72} className="fill-art-metal-3" />
        <circle cx={178} cy={96} r={10.8} className="fill-art-metal-1" />
        <circle cx={178} cy={96} r={3.5999999999999996} className="fill-art-metal-3" />
      </>
    ),
  },
  rino: {
    viewBox: "0 0 214 136",
    art: (
      <>
        <rect x={46} y={78} width={22} height={50} rx={9.166666666666668} className="fill-art-metal-2" />
        <rect x={46} y={121} width={22} height={8} rx={3} className="fill-art-metal-3" />
        <rect x={76} y={82} width={22} height={46} rx={9.166666666666668} className="fill-art-metal-2" />
        <rect x={76} y={121} width={22} height={8} rx={3} className="fill-art-metal-3" />
        <rect x={124} y={82} width={22} height={46} rx={9.166666666666668} className="fill-art-metal-2" />
        <rect x={124} y={121} width={22} height={8} rx={3} className="fill-art-metal-3" />
        <rect x={152} y={78} width={22} height={50} rx={9.166666666666668} className="fill-art-metal-2" />
        <rect x={152} y={121} width={22} height={8} rx={3} className="fill-art-metal-3" />
        <path d="M24 74Q20 40 70 34Q110 26 150 40Q176 48 176 76Q174 98 100 98Q28 98 24 74Z" className="fill-art-metal-2" />
        <path d="M24 70Q14 72 12 82" strokeWidth={5} strokeLinecap="round" fill="none" className="stroke-art-metal-2" />
        <path
          d="M60 44Q66 66 60 90M120 38Q126 62 120 92"
          strokeWidth={2.5}
          opacity={0.25}
          fill="none"
          className="stroke-art-ink"
        />
        <path d="M150 46Q170 34 194 52Q210 64 204 80Q196 88 178 86Q156 82 150 66Z" className="fill-art-metal-2" />
        <path d="M194 56L212 26L206 60Z" className="fill-art-white-2" />
        <path d="M180 50L188 34L192 54Z" className="fill-art-white-2" />
        <path d="M156 40L160 26L168 40Z" className="fill-art-metal-2" />
        <circle cx={172} cy={56} r={3} className="fill-art-ink" />
        <circle cx={173.05} cy={54.95} r={1.0499999999999998} className="fill-art-white" />
        <path d="M190 76Q196 78 202 74" strokeWidth={2.5} fill="none" strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  pickup: {
    viewBox: "0 0 234 122",
    art: (
      <>
        <path d="M10 90V60H104V30Q104 20 114 20H160Q170 20 176 28L196 56Q222 58 222 74V90Z" className="fill-art-red" />
        <path d="M114 28H156Q162 28 166 34L180 56H114Z" className="fill-art-blue-deep" />
        <path d="M146 28V56" strokeWidth={5} className="stroke-art-red" />
        <rect x={10} y={56} width={94} height={8} rx={2} className="fill-art-metal-3" />
        <path d="M30 64V90M56 64V90M82 64V90" strokeWidth={2} opacity={0.25} className="stroke-art-ink" />
        <rect x={208} y={62} width={12} height={9} rx={3} className="fill-art-gold" />
        <rect x={8} y={84} width={216} height={10} rx={5} className="fill-art-metal-3" />
        <circle cx={58} cy={94} r={22} className="fill-art-ink" />
        <circle cx={58} cy={94} r={17.16} className="fill-art-metal-3" />
        <circle cx={58} cy={94} r={9.9} className="fill-art-metal-1" />
        <circle cx={58} cy={94} r={3.3} className="fill-art-metal-3" />
        <circle cx={182} cy={94} r={22} className="fill-art-ink" />
        <circle cx={182} cy={94} r={17.16} className="fill-art-metal-3" />
        <circle cx={182} cy={94} r={9.9} className="fill-art-metal-1" />
        <circle cx={182} cy={94} r={3.3} className="fill-art-metal-3" />
      </>
    ),
  },
  iate: {
    viewBox: "0 0 236 118",
    art: (
      <>
        <path d="M8 66H222L200 104Q196 110 188 110H40Q30 110 24 102Z" className="fill-art-white" />
        <path d="M14 78H216L210 88H20Z" className="fill-art-blue" />
        <path d="M44 66V46Q44 40 50 40H168L194 66Z" className="fill-art-white-2" />
        <path d="M54 48H104V58H54Z M112 48H156V58H112Z" className="fill-art-blue-deep" />
        <path d="M162 48H170L182 60H162Z" className="fill-art-blue-deep" />
        <path d="M72 40V26Q72 22 76 22H140L158 40Z" className="fill-art-white" />
        <rect x={82} y={28} width={50} height={7} rx={2} className="fill-art-blue-deep" />
        <path d="M110 22V6M104 10H118" strokeWidth={3} strokeLinecap="round" className="stroke-art-metal-2" />
        <circle cx={110} cy={6} r={3} className="fill-art-volt" />
        <circle cx={40} cy={96} r={3} className="fill-art-metal-1" />
        <circle cx={52} cy={96} r={3} className="fill-art-metal-1" />
      </>
    ),
  },
  elefante: {
    viewBox: "0 0 214 156",
    art: (
      <>
        <path d="M30 72Q14 76 14 96" strokeWidth={5} strokeLinecap="round" fill="none" className="stroke-art-metal-1" />
        <rect x={44} y={84} width={26} height={64} rx={10.833333333333334} className="fill-art-metal-1" />
        <rect x={44} y={141} width={26} height={8} rx={3} className="fill-art-white-2" />
        <rect x={78} y={90} width={26} height={58} rx={10.833333333333334} className="fill-art-metal-1" />
        <rect x={78} y={141} width={26} height={8} rx={3} className="fill-art-white-2" />
        <rect x={120} y={90} width={26} height={58} rx={10.833333333333334} className="fill-art-metal-1" />
        <rect x={120} y={141} width={26} height={8} rx={3} className="fill-art-white-2" />
        <rect x={150} y={84} width={26} height={64} rx={10.833333333333334} className="fill-art-metal-1" />
        <rect x={150} y={141} width={26} height={8} rx={3} className="fill-art-white-2" />
        <ellipse cx={102} cy={74} rx={76} ry={44} className="fill-art-metal-1" />
        <circle cx={170} cy={62} r={34} className="fill-art-metal-1" />
        <ellipse cx={150} cy={64} rx={24} ry={32} className="fill-art-metal-2" />
        <path
          d="M194 70Q210 96 196 128Q192 136 184 130"
          strokeWidth={16}
          strokeLinecap="round"
          fill="none"
          className="stroke-art-metal-1"
        />
        <path d="M186 82Q196 96 188 104" strokeWidth={6} strokeLinecap="round" fill="none" className="stroke-art-white" />
        <circle cx={180} cy={54} r={3.4} className="fill-art-ink" />
        <circle cx={181.19} cy={52.81} r={1.19} className="fill-art-white" />
        <path d="M174 46L186 48" strokeWidth={2.5} strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  trator: {
    viewBox: "0 0 214 146",
    art: (
      <>
        <rect x={160} y={18} width={7} height={34} rx={3} className="fill-art-metal-3" />
        <rect x={157} y={14} width={13} height={6} rx={2} className="fill-art-metal-3" />
        <path d="M58 70V20H118L126 70Z" fill="none" strokeWidth={8} strokeLinejoin="round" className="stroke-art-metal-3" />
        <path d="M64 26H114L120 66H64Z" opacity={0.5} className="fill-art-blue" />
        <rect x={52} y={12} width={74} height={10} rx={4} className="fill-art-volt" />
        <path d="M40 70H190Q202 70 202 82V100H40Z" className="fill-art-volt" />
        <path d="M126 76H196" strokeWidth={3} opacity={0.3} className="stroke-art-ink" />
        <path d="M186 80V96" strokeWidth={3} opacity={0.3} className="stroke-art-ink" />
        <circle cx={68} cy={102} r={40} className="fill-art-ink" />
        <circle cx={68} cy={102} r={40} fill="none" strokeWidth={8} strokeDasharray="8 6" className="stroke-art-metal-3" />
        <circle cx={68} cy={102} r={20} className="fill-art-volt" />
        <circle cx={68} cy={102} r={7} className="fill-art-metal-3" />
        <circle cx={176} cy={116} r={22} className="fill-art-ink" />
        <circle cx={176} cy={116} r={17.16} className="fill-art-metal-3" />
        <circle cx={176} cy={116} r={9.9} className="fill-art-metal-1" />
        <circle cx={176} cy={116} r={3.3} className="fill-art-metal-3" />
      </>
    ),
  },
  trex: {
    viewBox: "0 0 214 160",
    art: (
      <>
        <path d="M70 82Q20 84 6 50Q30 72 74 66Z" className="fill-art-green" />
        <rect x={70} y={96} width={20} height={56} rx={8.333333333333334} className="fill-art-green" />
        <rect x={70} y={145} width={20} height={8} rx={3} className="fill-art-ink" />
        <rect x={98} y={96} width={20} height={56} rx={8.333333333333334} className="fill-art-green" />
        <rect x={98} y={145} width={20} height={8} rx={3} className="fill-art-ink" />
        <ellipse cx={96} cy={86} rx={44} ry={32} className="fill-art-green" />
        <ellipse cx={104} cy={96} rx={28} ry={18} className="fill-art-green-light" />
        <path d="M124 64Q132 36 162 28Q204 24 208 46Q210 60 196 64H168L162 74Q150 84 132 80Z" className="fill-art-green" />
        <path d="M164 64H196L194 70H166Z" opacity={0.5} className="fill-art-ink" />
        <path d="M170 64L173 70L176 64M180 64L183 70L186 64M190 64L193 70L196 64" className="fill-art-white" />
        <path d="M134 92Q146 90 148 100" strokeWidth={6} strokeLinecap="round" fill="none" className="stroke-art-green" />
        <circle cx={176} cy={40} r={3.6} className="fill-art-ink" />
        <circle cx={177.26} cy={38.74} r={1.26} className="fill-art-white" />
        <path d="M168 32L184 34" strokeWidth={3} strokeLinecap="round" className="stroke-art-ink" />
        <path d="M84 60L90 52L96 60M100 58L106 50L112 58" className="fill-art-volt" />
      </>
    ),
  },
  caminhao: {
    viewBox: "0 0 244 124",
    art: (
      <>
        <rect x={8} y={10} width={160} height={78} rx={6} className="fill-art-white-2" />
        <rect x={8} y={58} width={160} height={10} className="fill-art-volt" />
        <circle cx={40} cy={36} r={13} fill="none" strokeWidth={5} strokeDasharray="64 18" className="stroke-art-volt" />
        <path d="M174 88V40Q174 32 182 32H208Q216 32 222 40L236 62V88Z" className="fill-art-red" />
        <path d="M184 40H206L218 60H184Z" className="fill-art-blue-deep" />
        <rect x={226} y={70} width={10} height={8} rx={3} className="fill-art-gold" />
        <rect x={6} y={86} width={232} height={8} rx={4} className="fill-art-metal-3" />
        <circle cx={38} cy={98} r={18} className="fill-art-ink" />
        <circle cx={38} cy={98} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={38} cy={98} r={8.1} className="fill-art-metal-1" />
        <circle cx={38} cy={98} r={2.6999999999999997} className="fill-art-metal-3" />
        <circle cx={80} cy={98} r={18} className="fill-art-ink" />
        <circle cx={80} cy={98} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={80} cy={98} r={8.1} className="fill-art-metal-1" />
        <circle cx={80} cy={98} r={2.6999999999999997} className="fill-art-metal-3" />
        <circle cx={206} cy={98} r={18} className="fill-art-ink" />
        <circle cx={206} cy={98} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={206} cy={98} r={8.1} className="fill-art-metal-1" />
        <circle cx={206} cy={98} r={2.6999999999999997} className="fill-art-metal-3" />
      </>
    ),
  },
  onibus: {
    viewBox: "0 0 254 114",
    art: (
      <>
        <rect x={6} y={10} width={242} height={80} rx={14} className="fill-art-blue" />
        <rect x={6} y={66} width={242} height={8} className="fill-art-volt" />
        <path
          d="M22 22H58V54H22Z M66 22H102V54H66Z M110 22H146V54H110Z M154 22H190V54H154Z"
          opacity={0.85}
          className="fill-art-white"
        />
        <path d="M200 22H240V54H200Z" className="fill-art-blue-deep" />
        <rect x={204} y={14} width={34} height={6} rx={2} className="fill-art-gold" />
        <path d="M198 22V88M220 22V88" strokeWidth={2.5} opacity={0.3} className="stroke-art-ink" />
        <rect x={4} y={86} width={246} height={8} rx={4} className="fill-art-metal-3" />
        <circle cx={50} cy={94} r={17} className="fill-art-ink" />
        <circle cx={50} cy={94} r={13.26} className="fill-art-metal-3" />
        <circle cx={50} cy={94} r={7.65} className="fill-art-metal-1" />
        <circle cx={50} cy={94} r={2.55} className="fill-art-metal-3" />
        <circle cx={204} cy={94} r={17} className="fill-art-ink" />
        <circle cx={204} cy={94} r={13.26} className="fill-art-metal-3" />
        <circle cx={204} cy={94} r={7.65} className="fill-art-metal-1" />
        <circle cx={204} cy={94} r={2.55} className="fill-art-metal-3" />
      </>
    ),
  },
  carregado: {
    viewBox: "0 0 254 140",
    art: (
      <>
        <rect x={10} y={50} width={38} height={36} rx={3} className="fill-art-brown" />
        <rect x={50} y={50} width={38} height={36} rx={3} className="fill-art-brown-dark" />
        <rect x={90} y={50} width={38} height={36} rx={3} className="fill-art-brown" />
        <rect x={130} y={50} width={38} height={36} rx={3} className="fill-art-brown-dark" />
        <rect x={28} y={12} width={38} height={36} rx={3} className="fill-art-brown-dark" />
        <rect x={70} y={12} width={38} height={36} rx={3} className="fill-art-brown" />
        <rect x={112} y={12} width={38} height={36} rx={3} className="fill-art-brown-dark" />
        <path d="M10 68H168M28 30H150" strokeWidth={2} opacity={0.3} className="stroke-art-ink" />
        <path d="M8 48L172 48M26 10L152 10" strokeWidth={4} strokeLinecap="round" className="stroke-art-volt" />
        <rect x={6} y={86} width={168} height={8} className="fill-art-metal-3" />
        <path d="M178 94V46Q178 38 186 38H212Q220 38 226 46L240 68V94Z" className="fill-art-metal-1" />
        <path d="M188 46H210L222 66H188Z" className="fill-art-blue-deep" />
        <rect x={6} y={92} width={238} height={8} rx={4} className="fill-art-metal-3" />
        <circle cx={36} cy={104} r={18} className="fill-art-ink" />
        <circle cx={36} cy={104} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={36} cy={104} r={8.1} className="fill-art-metal-1" />
        <circle cx={36} cy={104} r={2.6999999999999997} className="fill-art-metal-3" />
        <circle cx={78} cy={104} r={18} className="fill-art-ink" />
        <circle cx={78} cy={104} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={78} cy={104} r={8.1} className="fill-art-metal-1" />
        <circle cx={78} cy={104} r={2.6999999999999997} className="fill-art-metal-3" />
        <circle cx={210} cy={104} r={18} className="fill-art-ink" />
        <circle cx={210} cy={104} r={14.040000000000001} className="fill-art-metal-3" />
        <circle cx={210} cy={104} r={8.1} className="fill-art-metal-1" />
        <circle cx={210} cy={104} r={2.6999999999999997} className="fill-art-metal-3" />
      </>
    ),
  },
  jubarte: {
    viewBox: "0 0 236 128",
    art: (
      <>
        <path d="M10 54Q4 30 20 22Q22 40 34 50Q36 30 54 28Q44 46 50 60Z" className="fill-art-blue-deep" />
        <path d="M40 60Q70 30 140 32Q200 34 222 62Q230 76 214 84Q170 98 110 92Q60 86 40 60Z" className="fill-art-blue-deep" />
        <path d="M120 92Q150 112 178 120Q160 98 156 90Z" className="fill-art-blue-deep" />
        <path
          d="M150 74Q186 84 216 78"
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.9}
          fill="none"
          className="stroke-art-white"
        />
        <path d="M152 82Q184 92 210 86" strokeWidth={3} opacity={0.6} fill="none" className="stroke-art-white" />
        <path d="M104 32L114 22L120 32Z" className="fill-art-blue-deep" />
        <circle cx={196} cy={48} r={2.5} className="fill-art-white" />
        <circle cx={182} cy={44} r={2} className="fill-art-white" />
        <circle cx={200} cy={64} r={3} className="fill-art-ink" />
        <circle cx={201.05} cy={62.95} r={1.0499999999999998} className="fill-art-white" />
        <path d="M206 72Q214 72 220 68" strokeWidth={2.5} fill="none" strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  aviao: {
    viewBox: "0 0 256 120",
    art: (
      <>
        <path d="M24 60L10 14H30L62 52Z" className="fill-art-volt" />
        <path d="M20 62L4 78H24L48 66Z" className="fill-art-metal-1" />
        <path d="M18 52H206Q246 52 250 66Q246 80 206 80H40Q18 80 14 66Z" className="fill-art-white" />
        <rect x={40} y={62} width={160} height={5} rx={2} className="fill-art-blue" />
        <path
          d="M60 58H66M74 58H80M88 58H94M102 58H108M116 58H122M130 58H136M144 58H150M158 58H164M172 58H178M186 58H192"
          strokeWidth={5}
          strokeLinecap="round"
          className="stroke-art-blue-deep"
        />
        <path d="M222 58L236 58Q242 60 244 64H224Z" className="fill-art-ink" />
        <path d="M108 72L150 72L104 112H84Z" className="fill-art-metal-1" />
        <rect x={106} y={86} width={34} height={14} rx={7} className="fill-art-metal-2" />
        <rect x={132} y={88} width={6} height={10} rx={3} className="fill-art-metal-3" />
      </>
    ),
  },
  vagao: {
    viewBox: "0 0 244 118",
    art: (
      <>
        <rect x={14} y={10} width={216} height={76} rx={6} className="fill-art-brown" />
        <path d="M40 10V86M66 10V86M178 10V86M204 10V86" strokeWidth={3} opacity={0.25} className="stroke-art-ink" />
        <rect x={92} y={18} width={60} height={62} rx={3} className="fill-art-brown-dark" />
        <path d="M122 18V80" strokeWidth={2.5} opacity={0.4} className="stroke-art-ink" />
        <rect x={90} y={46} width={64} height={5} className="fill-art-metal-2" />
        <rect x={14} y={10} width={216} height={8} rx={4} className="fill-art-metal-3" />
        <rect x={2} y={78} width={16} height={7} rx={3} className="fill-art-metal-3" />
        <rect x={226} y={78} width={16} height={7} rx={3} className="fill-art-metal-3" />
        <rect x={24} y={86} width={64} height={8} rx={3} className="fill-art-metal-3" />
        <rect x={156} y={86} width={64} height={8} rx={3} className="fill-art-metal-3" />
        <circle cx={40} cy={100} r={13} className="fill-art-ink" />
        <circle cx={40} cy={100} r={10.14} className="fill-art-metal-3" />
        <circle cx={40} cy={100} r={5.8500000000000005} className="fill-art-metal-1" />
        <circle cx={40} cy={100} r={1.95} className="fill-art-metal-3" />
        <circle cx={72} cy={100} r={13} className="fill-art-ink" />
        <circle cx={72} cy={100} r={10.14} className="fill-art-metal-3" />
        <circle cx={72} cy={100} r={5.8500000000000005} className="fill-art-metal-1" />
        <circle cx={72} cy={100} r={1.95} className="fill-art-metal-3" />
        <circle cx={172} cy={100} r={13} className="fill-art-ink" />
        <circle cx={172} cy={100} r={10.14} className="fill-art-metal-3" />
        <circle cx={172} cy={100} r={5.8500000000000005} className="fill-art-metal-1" />
        <circle cx={172} cy={100} r={1.95} className="fill-art-metal-3" />
        <circle cx={204} cy={100} r={13} className="fill-art-ink" />
        <circle cx={204} cy={100} r={10.14} className="fill-art-metal-3" />
        <circle cx={204} cy={100} r={5.8500000000000005} className="fill-art-metal-1" />
        <circle cx={204} cy={100} r={1.95} className="fill-art-metal-3" />
      </>
    ),
  },
  azul: {
    viewBox: "0 0 262 110",
    art: (
      <>
        <path d="M10 40Q2 22 14 14Q18 32 30 42Q32 22 48 20Q38 40 44 54Z" className="fill-art-blue" />
        <path d="M36 52Q80 34 160 36Q226 38 252 58Q258 70 244 76Q190 88 110 84Q60 80 36 52Z" className="fill-art-blue" />
        <path d="M140 82Q156 98 176 102Q164 86 162 80Z" className="fill-art-blue" />
        <path d="M150 70Q200 80 246 72" strokeWidth={8} strokeLinecap="round" fill="none" className="stroke-art-blue-light" />
        <circle cx={90} cy={54} r={4} opacity={0.3} className="fill-art-white" />
        <circle cx={118} cy={48} r={3} opacity={0.3} className="fill-art-white" />
        <circle cx={76} cy={62} r={2.5} opacity={0.3} className="fill-art-white" />
        <path d="M92 38L98 30L104 38Z" className="fill-art-blue" />
        <circle cx={228} cy={60} r={2.8} className="fill-art-ink" />
        <circle cx={228.98} cy={59.02} r={0.9799999999999999} className="fill-art-white" />
        <path d="M234 68Q242 68 248 64" strokeWidth={2.5} fill="none" strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
  estatua: {
    viewBox: "0 0 130 236",
    art: (
      <>
        <rect x={24} y={190} width={82} height={42} rx={4} className="fill-art-metal-1" />
        <rect x={32} y={180} width={66} height={12} rx={3} className="fill-art-white-2" />
        <path d="M24 206H106" strokeWidth={2} opacity={0.2} className="stroke-art-ink" />
        <path d="M40 180L46 96Q48 84 64 84Q80 84 82 96L90 180Z" className="fill-art-teal" />
        <path
          d="M52 104Q56 140 50 178M70 104Q66 140 74 178"
          strokeWidth={2.5}
          opacity={0.25}
          fill="none"
          className="stroke-art-ink"
        />
        <path d="M80 96L96 40" strokeWidth={12} strokeLinecap="round" className="stroke-art-teal" />
        <rect x={90} y={26} width={12} height={16} rx={3} className="fill-art-teal" />
        <path d="M96 4Q108 14 102 24H90Q86 14 96 4Z" className="fill-art-gold" />
        <path d="M96 12Q100 18 98 22H94Q92 18 96 12Z" className="fill-art-orange" />
        <path d="M48 108L36 120L40 140L52 132Z" className="fill-art-teal" />
        <rect x={30} y={118} width={16} height={22} rx={2} transform="rotate(-12 38 129)" className="fill-art-teal-dark" />
        <circle cx={64} cy={72} r={13} className="fill-art-teal" />
        <path
          d="M48 62L44 50M56 58L54 46M64 57V44M72 58L74 46M80 62L84 50"
          strokeWidth={4}
          strokeLinecap="round"
          className="stroke-art-teal"
        />
        <path d="M50 64Q64 54 78 64" strokeWidth={5} fill="none" className="stroke-art-teal" />
        <path d="M58 72H62M66 72H70" strokeWidth={2.5} strokeLinecap="round" className="stroke-art-ink" />
      </>
    ),
  },
};

export interface WeightObjectProps {
  kind: WeightObjectKind;
  /** Nome acessível ("Iate pequeno"). */
  label: string;
  className?: string;
}

/** Desenho do objeto, apoiado na base e centralizado na caixa (como no design). */
export function WeightObject({ kind, label, className }: WeightObjectProps) {
  const { viewBox, art } = OBJECTS[kind];
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMax meet" role="img" aria-label={label} className={className}>
      {art}
    </svg>
  );
}
