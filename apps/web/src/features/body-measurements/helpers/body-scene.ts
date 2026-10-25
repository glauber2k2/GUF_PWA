import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { animate } from "animejs";
import {
  AnchorCollector,
  BODY_REGION_COUNT,
  BODY_REGIONS,
  classifyVertex,
  readSkeleton,
  type BodyAnchor,
  type BodyRegion,
  type BodySkeleton,
} from "@/features/body-measurements/helpers/body-anatomy";

/**
 * Boneco anatômico 3D em raio-x (protótipo Claude Design "Registro de Medidas" · 2a): pele de vidro
 * com borda volt, os 8 músculos medidos com fibras, gira sozinho (arrastar gira), tocar num músculo
 * acende e mostra o pino, que acompanha o corpo. three.js renderiza; Anime.js anima os destaques.
 * Imperativo (fora do React): a tela monta, chama select/setTheme e destrói.
 */

export interface BodySceneOptions {
  modelUrl: string;
  reducedMotion: boolean;
  /** Toque do usuário num músculo (null = desmarcou). */
  onSelect: (key: BodyRegion | null) => void;
  /** Pino (desenhado pelo React) que a cena move a cada quadro, e a linha tracejada até o cartão. */
  pin: HTMLElement;
  pinLine: SVGPathElement;
  /** Distância do fundo da área até o ponto onde a linha encontra o cartão (px). */
  pinLineBottomPx: number;
}

export interface BodyScene {
  select: (key: BodyRegion | null) => void;
  /** Relê as cores dos tokens (troca de tema). */
  setTheme: () => void;
  destroy: () => void;
}

/** Valores de reserva se o token não estiver disponível (mesmos do tema escuro). */
const FALLBACK_COLORS: Record<string, string> = {
  "--accent": "#C6F432",
  "--text-muted": "#848C9A",
  "--surface-3": "#252A33",
  "--surface": "#14171C",
  "--border": "#2A2F38",
  "--text-primary": "#F3F5F7",
};
/** Movimento menor que isso entre apertar e soltar = toque (não arraste). */
const TAP_TOLERANCE_PX = 6;
/** Tocar perto de um músculo também conta (alvo maior que a malha). */
const NEAR_TAP_OFFSETS: ReadonlyArray<[number, number]> = [[0, 14], [0, -14], [14, 0], [-14, 0], [10, 10], [-10, 10], [10, -10], [-10, -10]];
const AUTO_ROTATE_RESUME_MS = 2500;

interface Palette {
  accent: THREE.Color;
  muscle: THREE.Color;
  fiber: THREE.Color;
  joint: THREE.Color;
  ghost: THREE.Color;
  grid: THREE.Color;
}

function readPalette(container: HTMLElement): Palette {
  const css = (name: string) => new THREE.Color(getComputedStyle(container).getPropertyValue(name).trim() || FALLBACK_COLORS[name]);
  const fiber = css("--surface-3").lerp(css("--text-muted"), 0.42);
  return {
    accent: css("--accent"),
    muscle: fiber.clone().lerp(css("--accent"), 0.12),
    fiber,
    joint: css("--surface-3"),
    ghost: css("--text-primary"),
    grid: css("--border"),
  };
}

interface Uniforms {
  uT: { value: number[] };
  uAccent: { value: THREE.Color };
  uMuscle: { value: THREE.Color };
  uPulse: { value: number };
  uFib: { value: number };
}

/** Músculo: cor de fibra que acende em volt conforme uT[região] (0 → 1) e pulsa ao selecionar. */
function muscleMaterial(palette: Palette, uniforms: Uniforms): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: palette.fiber.clone(), roughness: 0.5, metalness: 0.05 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      "attribute float aRegion;\nvarying float vRegion;\nvarying vec3 vWPos;\n" +
      shader.vertexShader
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRegion = aRegion;")
        .replace("#include <skinning_vertex>", "#include <skinning_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader =
      `uniform float uT[${BODY_REGION_COUNT}];\nuniform vec3 uAccent;\nuniform vec3 uMuscle;\nuniform float uPulse;\nuniform float uFib;\nvarying float vRegion;\nvarying vec3 vWPos;\n` +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float rT = clamp(uT[int(vRegion + 0.5)], 0.0, 1.0);
float isM = step(0.5, vRegion);
float fib = 0.5 + 0.5 * sin(vWPos.y * uFib + sin(vWPos.x * uFib * 0.3) * 1.6);
vec3 musc = mix(diffuseColor.rgb, uMuscle, isM);
musc = mix(musc, uAccent, rT) * (0.84 + 0.22 * fib * (1.0 - rT * 0.6));
diffuseColor.rgb = musc;`,
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uAccent * rT * isM * (0.14 + 0.12 * uPulse);");
  };
  return material;
}

/** Pele de vidro: a mesma malha um pouco inflada, transparente, com borda (Fresnel) em volt. */
function glassShell(source: THREE.SkinnedMesh, palette: Palette, uniforms: Uniforms, height: number): THREE.SkinnedMesh {
  const material = new THREE.MeshStandardMaterial({ color: palette.ghost.clone(), roughness: 0.2, metalness: 0, transparent: true, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAccent = uniforms.uAccent;
    shader.uniforms.uInfl = { value: (height * 0.009) / source.getWorldScale(new THREE.Vector3()).x };
    shader.vertexShader =
      "uniform float uInfl;\n" + shader.vertexShader.replace("#include <skinning_vertex>", "#include <skinning_vertex>\ntransformed += normalize(objectNormal) * uInfl;");
    shader.fragmentShader =
      "uniform vec3 uAccent;\n" +
      shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
gl_FragColor.rgb = mix(gl_FragColor.rgb, uAccent, fr * 0.22);
gl_FragColor.a = 0.1 + fr * 0.8;`,
      );
  };
  const shell = new THREE.SkinnedMesh(source.geometry, material);
  shell.bind(source.skeleton, source.bindMatrix);
  shell.frustumCulled = false;
  shell.renderOrder = 2;
  source.parent?.add(shell);
  shell.position.copy(source.position);
  shell.quaternion.copy(source.quaternion);
  shell.scale.copy(source.scale);
  return shell;
}

/** Grava em cada vértice a região (atributo aRegion) e junta os pontos dos pinos. */
function tagRegions(mesh: THREE.SkinnedMesh, skeleton: BodySkeleton, anchors: AnchorCollector, isJoint: boolean) {
  const geometry = mesh.geometry;
  const count = geometry.attributes.position.count;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  const normals = geometry.attributes.normal;
  const regions = new Float32Array(count);
  const normalMatrices = new Map<number, THREE.Matrix3>();
  const normalMatrixFor = (boneIndex: number) => {
    const cached = normalMatrices.get(boneIndex);
    if (cached) return cached;
    const skinned = new THREE.Matrix4()
      .copy(mesh.matrixWorld)
      .multiply(mesh.bindMatrixInverse)
      .multiply(mesh.skeleton.bones[boneIndex].matrixWorld)
      .multiply(mesh.skeleton.boneInverses[boneIndex])
      .multiply(mesh.bindMatrix);
    const matrix = new THREE.Matrix3().getNormalMatrix(skinned);
    normalMatrices.set(boneIndex, matrix);
    return matrix;
  };
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let boneIndex = 0;
    let bestWeight = -1;
    for (let k = 0; k < 4; k++) {
      const weight = skinWeight.getComponent(i, k);
      if (weight > bestWeight) {
        bestWeight = weight;
        boneIndex = skinIndex.getComponent(i, k);
      }
    }
    mesh.getVertexPosition(i, position);
    position.applyMatrix4(mesh.matrixWorld);
    const region = classifyVertex(mesh.skeleton.bones[boneIndex].name, position, skeleton);
    // Juntas (esferas do modelo) só acendem na cintura, para o abdômen fechar a volta.
    regions[i] = isJoint && region !== BODY_REGIONS.indexOf("abdomen") ? 0 : region;
    if (region && !isJoint && normals) {
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrixFor(boneIndex)).normalize();
      anchors.add(region, position.clone(), normal.clone(), boneIndex);
    }
  }
  geometry.setAttribute("aRegion", new THREE.BufferAttribute(regions, 1));
}

/** Chão: sombra suave, grade e o anel do guf girando. */
function buildFloor(scene: THREE.Scene, palette: Palette, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,.6)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(height * 0.55, height * 0.55),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -height * 0.07;
  scene.add(shadow);

  const ringGroup = new THREE.Group();
  ringGroup.position.y = -height * 0.068;
  scene.add(ringGroup);
  const radius = height * 0.3;
  const ringMaterial = new THREE.MeshBasicMaterial({ color: palette.accent.clone(), transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius * 1.025, 128, 1, 0.5, Math.PI * 2 - 1), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ringGroup.add(ring);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: palette.accent.clone(), side: THREE.DoubleSide });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.035, 24), dotMaterial);
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(radius * 1.0125, 0, 0);
  ringGroup.add(dot);

  const grid = new THREE.GridHelper(height * 1.6, 20, palette.grid, palette.grid);
  grid.position.y = -height * 0.07;
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.45;
  gridMaterial.depthWrite = false;
  scene.add(grid);

  return { shadow, ringGroup, accentMaterials: [ringMaterial, dotMaterial] };
}

/** Monta o boneco dentro de `container` (o canvas ocupa a área toda). */
export async function mountBodyScene(container: HTMLElement, options: BodySceneOptions): Promise<BodyScene> {
  const { reducedMotion } = options;
  let palette = readPalette(container);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "block size-full touch-none cursor-grab";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d22, 1.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(2, 3.5, 3);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
  rimLight.position.set(-2.5, 2.5, -3);
  scene.add(rimLight);

  const gltf = await new GLTFLoader().loadAsync(options.modelUrl);
  const model = gltf.scene;
  const root = new THREE.Group();
  root.add(model);
  scene.add(root);

  const uniforms: Uniforms = {
    uT: { value: new Array<number>(BODY_REGION_COUNT).fill(0) },
    uAccent: { value: palette.accent.clone() },
    uMuscle: { value: palette.muscle.clone() },
    uPulse: { value: 0 },
    uFib: { value: 1 },
  };
  const meshes: THREE.SkinnedMesh[] = [];
  model.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(object as THREE.SkinnedMesh);
  });
  model.updateMatrixWorld(true);

  const skeleton = readSkeleton(meshes[0].skeleton.bones, model);
  const H = skeleton.height;
  const collector = new AnchorCollector(skeleton);
  const joints = new Set<THREE.SkinnedMesh>();
  for (const mesh of meshes) {
    const isJoint = /joint/i.test(mesh.name);
    if (isJoint) joints.add(mesh);
    tagRegions(mesh, skeleton, collector, isJoint);
    mesh.material = isJoint
      ? new THREE.MeshStandardMaterial({ color: palette.joint.clone(), roughness: 0.35, metalness: 0.3 })
      : muscleMaterial(palette, uniforms);
    mesh.frustumCulled = false;
  }
  uniforms.uFib.value = (Math.PI * 2) / (H * 0.0042);
  const surface = meshes.find((mesh) => !joints.has(mesh)) ?? meshes[0];
  const shell = glassShell(surface, palette, uniforms, H);
  const anchors: BodyAnchor[] = collector.build(surface.skeleton.bones);

  // Postura natural com o clipe "idle" do modelo.
  const mixer = new THREE.AnimationMixer(model);
  const idle = gltf.animations.find((clip) => /idle/i.test(clip.name)) ?? gltf.animations[0];
  if (idle && !reducedMotion) mixer.clipAction(idle).play();

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  camera.position.set(0, H * 0.56, H * 2.75 * skeleton.forward);
  const floor = buildFloor(scene, palette, H);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, H * 0.47, 0);
  Object.assign(controls, {
    enableDamping: true,
    dampingFactor: 0.06,
    rotateSpeed: 0.85,
    enablePan: false,
    enableZoom: false,
    minPolarAngle: Math.PI * 0.34,
    maxPolarAngle: Math.PI * 0.6,
    autoRotate: !reducedMotion,
    autoRotateSpeed: 1.4,
  });
  let selected: BodyRegion | null = null;
  let resumeTimer: number | undefined;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    window.clearTimeout(resumeTimer);
    canvas.classList.replace("cursor-grab", "cursor-grabbing");
  });
  controls.addEventListener("end", () => {
    canvas.classList.replace("cursor-grabbing", "cursor-grab");
    if (!reducedMotion) resumeTimer = window.setTimeout(() => (controls.autoRotate = !selected), AUTO_ROTATE_RESUME_MS);
  });

  // Destaques: Anime.js anima estes números e o shader lê uT a cada quadro.
  // Um objeto por músculo: o Anime.js 4 trata uma lista como vários alvos (número não pode ser alvo).
  const selectedLevel = Array.from({ length: BODY_REGION_COUNT }, () => ({ value: 0 }));
  const hoverLevel = Array.from({ length: BODY_REGION_COUNT }, () => ({ value: 0 }));
  const paint = () => {
    for (let i = 1; i < BODY_REGION_COUNT; i++) uniforms.uT.value[i] = Math.max(selectedLevel[i].value, hoverLevel[i].value * 0.4);
  };

  function select(next: BodyRegion | null, fromUser: boolean) {
    const previous = selected;
    selected = next;
    for (let i = 1; i < BODY_REGION_COUNT; i++) {
      const on = BODY_REGIONS[i] === next ? 1 : 0;
      if (reducedMotion) selectedLevel[i].value = on;
      else animate(selectedLevel[i], { value: on, duration: on ? 480 : 280, ease: on ? "outBack(1.4)" : "outQuad", onUpdate: paint });
    }
    paint();
    if (next && !reducedMotion) {
      uniforms.uPulse.value = 1;
      animate(uniforms.uPulse, { value: 0, duration: 900, ease: "outQuad" });
    }
    controls.autoRotate = !reducedMotion && !next;
    if (fromUser && previous !== next) options.onSelect(next);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitRegion = (clientX: number, clientY: number): BodyRegion | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit?.face) return null;
    const regions = (hit.object as THREE.Mesh).geometry.attributes.aRegion;
    const index = [regions.getX(hit.face.a), regions.getX(hit.face.b), regions.getX(hit.face.c)].find(Boolean);
    return index ? (BODY_REGIONS[index] as BodyRegion) : null;
  };
  const regionAt = (event: PointerEvent): BodyRegion | null => {
    const direct = hitRegion(event.clientX, event.clientY);
    if (direct) return direct;
    for (const [dx, dy] of NEAR_TAP_OFFSETS) {
      const near = hitRegion(event.clientX + dx, event.clientY + dy);
      if (near) return near;
    }
    return null;
  };

  let pressed: { x: number; y: number } | null = null;
  let hovered: BodyRegion | null = null;
  const setHover = (key: BodyRegion | null) => {
    if (key === hovered) return;
    if (hovered) animate(hoverLevel[BODY_REGIONS.indexOf(hovered)], { value: 0, duration: 180, ease: "outQuad", onUpdate: paint });
    hovered = key;
    if (key) animate(hoverLevel[BODY_REGIONS.indexOf(key)], { value: 1, duration: 180, ease: "outQuad", onUpdate: paint });
    canvas.classList.toggle("cursor-pointer", Boolean(key));
  };
  const onPointerDown = (event: PointerEvent) => (pressed = { x: event.clientX, y: event.clientY });
  const onPointerUp = (event: PointerEvent) => {
    if (!pressed) return;
    const moved = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
    pressed = null;
    if (moved > TAP_TOLERANCE_PX) return;
    const key = regionAt(event);
    // Tocar no mesmo músculo ou fora do corpo desmarca.
    select(key && key !== selected ? key : null, true);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && !pressed) setHover(regionAt(event));
  };
  const onPointerLeave = () => setHover(null);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);

  // Pino: só o lado mais visível do músculo selecionado; some quando ele fica de costas.
  const worldPoint = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const boneRotation = new THREE.Quaternion();
  const toCamera = new THREE.Vector3();
  const projected = new THREE.Vector3();
  function updatePin() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    let best: { x: number; y: number; facing: number } | null = null;
    for (const anchor of anchors) {
      if (anchor.key !== selected) continue;
      worldPoint.copy(anchor.local);
      anchor.bone.localToWorld(worldPoint);
      anchor.bone.getWorldQuaternion(boneRotation);
      worldNormal.copy(anchor.normalLocal).applyQuaternion(boneRotation);
      const facing = worldNormal.dot(toCamera.copy(camera.position).sub(worldPoint).normalize());
      if (best && facing <= best.facing) continue;
      projected.copy(worldPoint).project(camera);
      best = { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, facing };
    }
    const visible = best !== null && best.facing > 0.05;
    options.pin.dataset.visible = String(visible);
    options.pinLine.dataset.visible = String(visible);
    if (!best || !visible) return;
    options.pin.style.transform = `translate(${best.x.toFixed(1)}px, ${best.y.toFixed(1)}px)`;
    const endX = width / 2;
    const endY = height - options.pinLineBottomPx;
    const midY = ((best.y + endY) / 2).toFixed(1);
    options.pinLine.setAttribute("d", `M${best.x.toFixed(1)} ${(best.y + 10).toFixed(1)} L${best.x.toFixed(1)} ${midY} L${endX} ${midY} L${endX} ${endY}`);
  }

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  if (!reducedMotion) {
    // Entrada: cresce, sobe e termina de girar de frente.
    root.scale.setScalar(0.88);
    root.position.y = -H * 0.12;
    root.rotation.y = -Math.PI;
    animate(root.scale, { x: 1, y: 1, z: 1, duration: 1100, ease: "outBack(1.3)" });
    animate(root.position, { y: 0, duration: 1200, ease: "outExpo" });
    animate(root.rotation, { y: 0, duration: 1700, ease: "outExpo" });
  }
  paint();

  const timer = new THREE.Timer();
  let frame = 0;
  const loop = (time: number) => {
    frame = requestAnimationFrame(loop);
    timer.update(time);
    const elapsed = timer.getElapsed();
    mixer.update(timer.getDelta());
    if (!reducedMotion) {
      // Flutua de leve; a sombra acompanha.
      const bob = Math.sin(elapsed * 1.3) * H * 0.022;
      model.position.y = -box.min.y + bob;
      model.rotation.z = Math.sin(elapsed * 0.8) * 0.018;
      const shrink = 1 - (bob / H) * 4;
      floor.shadow.scale.set(shrink, shrink, 1);
      (floor.shadow.material as THREE.MeshBasicMaterial).opacity = 0.95 - (bob / H) * 8;
      floor.ringGroup.rotation.y = elapsed * 0.4;
    }
    controls.update();
    renderer.render(scene, camera);
    updatePin();
  };
  model.position.y = -box.min.y;
  frame = requestAnimationFrame(loop);

  return {
    select: (key) => {
      if (key !== selected) select(key, false);
    },
    setTheme: () => {
      palette = readPalette(container);
      uniforms.uAccent.value.copy(palette.accent);
      uniforms.uMuscle.value.copy(palette.muscle);
      for (const material of floor.accentMaterials) material.color.copy(palette.accent);
      for (const mesh of meshes) (mesh.material as THREE.MeshStandardMaterial).color.copy(joints.has(mesh) ? palette.joint : palette.fiber);
      (shell.material as THREE.MeshStandardMaterial).color.copy(palette.ghost);
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
