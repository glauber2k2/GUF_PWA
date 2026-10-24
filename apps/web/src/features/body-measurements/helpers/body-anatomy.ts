import * as THREE from "three";
import type { MeasurementPartKey } from "@guf/core";

/**
 * Anatomia do boneco 3D (modelo humanoide com esqueleto do Mixamo, "mixamorig:*"): a qual músculo
 * medido cada vértice pertence e onde fica o pino de cada músculo. Índice 0 = fora das medidas.
 * Ordem igual ao uniform uT[] do shader (protótipo Claude Design "Registro de Medidas" · boneco3d.js).
 */
export const BODY_REGIONS = ["", "peito", "ombro", "biceps", "antebraco", "abdomen", "gluteos", "quadriceps", "panturrilha"] as const;
export type BodyRegion = Exclude<(typeof BODY_REGIONS)[number], "">;
export const BODY_REGION_COUNT = BODY_REGIONS.length;

const REGION_INDEX = Object.fromEntries(BODY_REGIONS.map((key, i) => [key, i])) as Record<(typeof BODY_REGIONS)[number], number>;
/** Músculos com dois lados: o pino de cada lado é calculado à parte. */
const SIDED_REGIONS = new Set([REGION_INDEX.ombro, REGION_INDEX.biceps, REGION_INDEX.antebraco, REGION_INDEX.quadriceps, REGION_INDEX.panturrilha]);
/** Mínimo de vértices virados para fora para um lado virar pino. */
const MIN_ANCHOR_VERTICES = 8;

export function isBodyRegion(key: string | null): key is BodyRegion & MeasurementPartKey {
  return key !== null && key !== "" && (BODY_REGIONS as readonly string[]).includes(key);
}

interface LimbJoints {
  arm: THREE.Vector3;
  fore: THREE.Vector3;
  hand: THREE.Vector3;
  up: THREE.Vector3;
  knee: THREE.Vector3;
  foot: THREE.Vector3;
  shoulder: THREE.Vector3;
}

/** Posições do esqueleto em repouso que servem de referência para separar os músculos. */
export interface BodySkeleton {
  bones: THREE.Bone[];
  height: number;
  /** +1 ou −1: para onde o boneco olha no eixo Z. */
  forward: number;
  hips: THREE.Vector3;
  spine2: THREE.Vector3;
  neck: THREE.Vector3;
  limbs: Record<"Left" | "Right", LimbJoints>;
  leftSign: number;
}

/** Pino de um músculo (um por lado): posição e normal no espaço do osso, para acompanhar o corpo. */
export interface BodyAnchor {
  key: BodyRegion;
  bone: THREE.Bone;
  local: THREE.Vector3;
  normalLocal: THREE.Vector3;
}

export function readSkeleton(bones: THREE.Bone[], model: THREE.Object3D): BodySkeleton {
  const bone = (name: string) => bones.find((b) => new RegExp(`${name}$`).test(b.name));
  const at = (name: string) => bone(name)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
  const box = new THREE.Box3().setFromObject(model);
  const limb = (side: "Left" | "Right"): LimbJoints => ({
    arm: at(`${side}Arm`),
    fore: at(`${side}ForeArm`),
    hand: at(`${side}Hand`),
    up: at(`${side}UpLeg`),
    knee: at(`${side}Leg`),
    foot: at(`${side}Foot`),
    shoulder: at(`${side}Shoulder`),
  });
  const limbs = { Left: limb("Left"), Right: limb("Right") };
  const hips = at("Hips");
  return {
    bones,
    height: box.max.y - box.min.y,
    forward: Math.sign(at("LeftToeBase").z - at("LeftFoot").z) || 1,
    hips,
    spine2: at("Spine2"),
    neck: at("Neck"),
    limbs,
    leftSign: Math.sign(limbs.Left.arm.x - hips.x),
  };
}

/** Fração (0 → a, 1 → b) da projeção de v no segmento a–b. */
function along(v: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  return v.clone().sub(a).dot(ab) / ab.lengthSq();
}

/** Índice da região do vértice v (pose de repouso) pelo osso dominante e pela posição. */
export function classifyVertex(boneName: string, v: THREE.Vector3, s: BodySkeleton): number {
  const side = /Left/.test(boneName) ? "Left" : /Right/.test(boneName) ? "Right" : null;
  const limb = side ? s.limbs[side] : null;
  const H = s.height;
  const front = (v.z - s.hips.z) * s.forward > 0;
  if (/ForeArm$/.test(boneName)) return REGION_INDEX.antebraco;
  if (/Hand|Thumb|Index|Middle|Ring|Pinky|Head|Eye|Toe|Foot$/.test(boneName)) return 0;
  if (/Arm$/.test(boneName) && limb) return along(v, limb.arm, limb.fore) < 0.22 ? REGION_INDEX.ombro : REGION_INDEX.biceps;
  if (/Shoulder$/.test(boneName) && limb) {
    if (Math.abs(v.x - s.hips.x) > Math.abs(limb.arm.x - s.hips.x) * 0.82) return REGION_INDEX.ombro;
    return front && v.y < s.neck.y - 0.02 * H ? REGION_INDEX.peito : 0;
  }
  // Abdômen = faixa da cintura inteira (frente, lados e costas), como a fita mede.
  const waist = v.y > s.hips.y - 0.005 * H && v.y < s.spine2.y - 0.04 * H;
  if (/Spine2?$|Spine1$|Neck$/.test(boneName)) {
    if (front && v.y > s.spine2.y - 0.035 * H && v.y < s.neck.y - 0.015 * H) return REGION_INDEX.peito;
    return waist ? REGION_INDEX.abdomen : 0;
  }
  if (/Hips$/.test(boneName)) {
    if (waist) return REGION_INDEX.abdomen;
    return !front && v.y < s.hips.y + 0.01 * H ? REGION_INDEX.gluteos : 0;
  }
  if (/UpLeg$/.test(boneName) && limb) {
    const t = along(v, limb.up, limb.knee);
    if (!front && t < 0.22) return REGION_INDEX.gluteos;
    return t > 0.08 && t < 0.86 ? REGION_INDEX.quadriceps : 0;
  }
  if (/Leg$/.test(boneName) && limb) {
    const t = along(v, limb.knee, limb.foot);
    return t > 0.12 && t < 0.72 ? REGION_INDEX.panturrilha : 0;
  }
  return 0;
}

interface AnchorSum {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  count: number;
  boneVotes: Map<number, number>;
}

/** Acumula, por músculo e lado, os vértices virados para a câmera (glúteos: para trás) que viram o pino. */
export class AnchorCollector {
  private sums = new Map<string, AnchorSum>();

  constructor(private skeleton: BodySkeleton) {}

  add(region: number, position: THREE.Vector3, normal: THREE.Vector3, boneIndex: number) {
    const s = this.skeleton;
    const facing = normal.z * s.forward;
    const wanted = region === REGION_INDEX.gluteos ? facing < -0.35 : facing > 0.35;
    const sided = SIDED_REGIONS.has(region);
    if (!wanted || (sided && Math.abs(position.x - s.hips.x) <= 0.01 * s.height)) return;
    const side = sided ? (Math.sign(position.x - s.hips.x) === s.leftSign ? "L" : "R") : "C";
    const id = `${region}:${side}`;
    const sum = this.sums.get(id) ?? { position: new THREE.Vector3(), normal: new THREE.Vector3(), count: 0, boneVotes: new Map() };
    sum.position.add(position);
    sum.normal.add(normal);
    sum.count += 1;
    sum.boneVotes.set(boneIndex, (sum.boneVotes.get(boneIndex) ?? 0) + 1);
    this.sums.set(id, sum);
  }

  build(bones: THREE.Bone[]): BodyAnchor[] {
    const H = this.skeleton.height;
    return [...this.sums.entries()]
      .filter(([, sum]) => sum.count > MIN_ANCHOR_VERTICES)
      .map(([id, sum]) => {
        const region = BODY_REGIONS[Number(id.split(":")[0])] as BodyRegion;
        const boneIndex = [...sum.boneVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const bone = bones[boneIndex];
        const normal = sum.normal.normalize();
        // Um pouco para fora da pele: o pino fica sobre o músculo, não dentro.
        const point = sum.position.divideScalar(sum.count).addScaledVector(normal, H * 0.012);
        const inverse = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
        return { key: region, bone, local: bone.worldToLocal(point.clone()), normalLocal: normal.clone().applyQuaternion(inverse) };
      });
  }
}
