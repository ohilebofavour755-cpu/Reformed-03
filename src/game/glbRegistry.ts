import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type GlbRoleKey =
  | "maleplayer"
  | "fplayer"
  | "police"
  | "mannpc"
  | "femalenpc"
  | "ch"
  | "beachmale"
  | "beach"
  | "trampoline"
  | "bicyclenpc";

const REMOTE_GLB_BASE = "https://ohilebofavour755-cpu.github.io/Reformed-03";
const FETCH_TIMEOUT_MS = 4000;
const RETRY_COOLDOWN_MS = 4000;
const MAX_REMOTE_CONCURRENT = 2;

// Serve 4 local .glb files from public/ and load the 6 remote .glb files directly from GitHub Pages
export const GLB_PUBLIC_URLS: Record<GlbRoleKey, string[]> = {
  maleplayer: [`${REMOTE_GLB_BASE}/Maleplayer.glb`],
  fplayer: [`${REMOTE_GLB_BASE}/Fplayer.glb`],
  police: ["/police.glb", "/Police.glb"],
  mannpc: [`${REMOTE_GLB_BASE}/Mannpc.glb`],
  femalenpc: [`${REMOTE_GLB_BASE}/Femalenpc.glb`],
  ch: [`${REMOTE_GLB_BASE}/C%26h.glb`, `${REMOTE_GLB_BASE}/C&h.glb`],
  beachmale: ["/Beachmale.glb"],
  beach: ["/Beach.glb"],
  trampoline: ["/trampoline.glb"],
  bicyclenpc: [`${REMOTE_GLB_BASE}/bicyclenpc.glb`],
};

const TARGET_HEIGHT: Record<GlbRoleKey, number> = {
  maleplayer: 1.74,
  fplayer: 1.66,
  police: 1.76,
  mannpc: 1.72,
  femalenpc: 1.65,
  ch: 1.66,
  beachmale: 1.74,
  beach: 1.68,
  trampoline: 2.15,
  bicyclenpc: 1.55,
};

export interface GlbTemplate {
  key: GlbRoleKey;
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  height: number;
  protoGeometries: Set<THREE.BufferGeometry>;
  protoMaterials: Set<THREE.Material>;
}

const cache = new Map<GlbRoleKey, GlbTemplate>();
const failedAt = new Map<GlbRoleKey, number>();
const inflight = new Map<GlbRoleKey, Promise<GlbTemplate | null>>();
const listeners = new Set<() => void>();

type QueueTask = {
  key: GlbRoleKey;
  run: () => void;
};
const remoteQueue: QueueTask[] = [];
let activeRemoteCount = 0;

const _tmpBox = new THREE.Box3();
const _tmpDim = new THREE.Vector3();
const _tmpCenter = new THREE.Vector3();
const _tmpScale = new THREE.Vector3();

let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const loader = new GLTFLoader();
  loader.setCrossOrigin("anonymous");
  // Support KHR_materials_pbrSpecularGlossiness (used by police.glb) cleanly in modern Three.js
  loader.register((parser) => ({
    name: "KHR_materials_pbrSpecularGlossiness",
    extendMaterialParams(materialIndex: number, materialParams: Record<string, unknown>) {
      const matDef = parser.json.materials?.[materialIndex];
      const ext = matDef?.extensions?.KHR_materials_pbrSpecularGlossiness as
        | {
            diffuseFactor?: number[];
            diffuseTexture?: { index: number; texCoord?: number };
            glossinessFactor?: number;
          }
        | undefined;
      if (!ext) return Promise.resolve();
      const pending: Promise<unknown>[] = [];
      if (Array.isArray(ext.diffuseFactor)) {
        const [r = 1, g = 1, b = 1, a = 1] = ext.diffuseFactor;
        materialParams["color"] = new THREE.Color(r, g, b);
        materialParams["opacity"] = a;
        if (a < 1) materialParams["transparent"] = true;
      }
      if (ext.diffuseTexture !== undefined) {
        pending.push(
          parser.assignTexture(
            materialParams as never,
            "map",
            ext.diffuseTexture,
            THREE.SRGBColorSpace,
          ),
        );
      }
      const gloss = ext.glossinessFactor ?? 0.35;
      materialParams["roughness"] = Math.max(0.25, Math.min(0.95, 1 - gloss * 0.65));
      materialParams["metalness"] = 0.08;
      return Promise.all(pending);
    },
  }));
  sharedLoader = loader;
  return loader;
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function scheduleRemote<T>(key: GlbRoleKey, priority: boolean, work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      activeRemoteCount++;
      work()
        .then(resolve, reject)
        .finally(() => {
          activeRemoteCount = Math.max(0, activeRemoteCount - 1);
          const next = remoteQueue.shift();
          if (next) next.run();
        });
    };

    if (activeRemoteCount < MAX_REMOTE_CONCURRENT) {
      start();
    } else if (priority) {
      remoteQueue.unshift({ key, run: start });
    } else {
      remoteQueue.push({ key, run: start });
    }
  });
}

async function fetchGlbBuffer(url: string): Promise<ArrayBuffer | null> {
  if (typeof window === "undefined") return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Standard fetch(url) with zero custom headers so GitHub Pages never rejects or stalls on CORS preflight
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (ct.includes("text/html") || ct.includes("application/xhtml")) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 12) return null;
    const bytes = new Uint8Array(buffer, 0, 4);
    const isGlbMagic =
      bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
    const isJson = bytes[0] === 0x7b;
    return isGlbMagic || isJson ? buffer : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeScene(
  raw: THREE.Group,
  targetHeight: number,
  key: GlbRoleKey,
): {
  scene: THREE.Group;
  protoGeometries: Set<THREE.BufferGeometry>;
  protoMaterials: Set<THREE.Material>;
} {
  raw.updateMatrixWorld(true);
  _tmpBox.setFromObject(raw);
  _tmpBox.getSize(_tmpDim);

  // If a humanoid model was exported Z-up lying flat, stand it upright along +Y
  if (
    key !== "trampoline" &&
    _tmpDim.z > _tmpDim.y * 1.8 &&
    _tmpDim.y < Math.max(_tmpDim.x, _tmpDim.z) * 0.65
  ) {
    raw.rotation.x = -Math.PI / 2;
    raw.updateMatrixWorld(true);
    _tmpBox.setFromObject(raw);
    _tmpBox.getSize(_tmpDim);
  }

  _tmpBox.getCenter(_tmpCenter);
  const s = targetHeight / Math.max(_tmpDim.y, 0.001);

  raw.scale.multiplyScalar(s);
  raw.position.set(
    raw.position.x - _tmpCenter.x * s,
    raw.position.y - _tmpBox.min.y * s,
    raw.position.z - _tmpCenter.z * s,
  );

  const protoGeometries = new Set<THREE.BufferGeometry>();
  const protoMaterials = new Set<THREE.Material>();
  const isMobile =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || window.matchMedia?.("(pointer: coarse)")?.matches === true);

  raw.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = !(obj instanceof THREE.SkinnedMesh);
      if (obj.geometry instanceof THREE.BufferGeometry) protoGeometries.add(obj.geometry);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        protoMaterials.add(m);
        if (isMobile && m instanceof THREE.MeshStandardMaterial) {
          if (m.map) m.map.anisotropy = 1;
          if (m.normalMap) m.normalMap.anisotropy = 1;
          if (m.roughnessMap) m.roughnessMap.anisotropy = 1;
        }
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(raw);
  wrapper.updateMatrixWorld(true);
  return { scene: wrapper, protoGeometries, protoMaterials };
}

export function getCachedGlb(key: GlbRoleKey): GlbTemplate | null {
  return cache.get(key) ?? null;
}

export function getCachedGlbWithFallback(key: GlbRoleKey): GlbTemplate | null {
  return cache.get(key) ?? null;
}

export function getGlbAvailability(): { available: GlbRoleKey[]; missing: GlbRoleKey[] } {
  const keys = Object.keys(GLB_PUBLIC_URLS) as GlbRoleKey[];
  const available: GlbRoleKey[] = [];
  const missing: GlbRoleKey[] = [];
  for (const k of keys) {
    if (cache.has(k)) available.push(k);
    else missing.push(k);
  }
  return { available, missing };
}

export function ensureGlbLoaded(key: GlbRoleKey, priority = false): Promise<GlbTemplate | null> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const lastFail = failedAt.get(key);
  if (lastFail && Date.now() - lastFail < RETRY_COOLDOWN_MS) {
    return Promise.resolve(null);
  }

  const job = (async () => {
    const urls = GLB_PUBLIC_URLS[key];
    const hasRemote = urls.some(isRemoteUrl);
    const runFetchAndParse = async (): Promise<GlbTemplate | null> => {
      for (const url of urls) {
        const buffer = await fetchGlbBuffer(url);
        if (!buffer) continue;
        try {
          const gltf = await getLoader().parseAsync(buffer, "");
          const height = TARGET_HEIGHT[key];
          const { scene, protoGeometries, protoMaterials } = normalizeScene(
            gltf.scene,
            height,
            key,
          );
          const animations = (gltf.animations ?? []).map((clip) => clip.clone().optimize());
          return {
            key,
            url,
            scene,
            animations,
            height,
            protoGeometries,
            protoMaterials,
          };
        } catch {
          // Try next candidate URL if parsing failed
        }
      }
      return null;
    };

    try {
      const tpl = hasRemote
        ? await scheduleRemote(key, priority, runFetchAndParse)
        : await runFetchAndParse();
      if (tpl) {
        failedAt.delete(key);
        cache.set(key, tpl);
        listeners.forEach((fn) => fn());
        return tpl;
      }
      failedAt.set(key, Date.now());
      return null;
    } catch {
      failedAt.set(key, Date.now());
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function preloadCharacterCreateGlbs(selectedKey: GlbRoleKey = "fplayer") {
  void ensureGlbLoaded(selectedKey, true);
}

export function preloadCityNpcGlbs() {
  const ordered: GlbRoleKey[] = [
    "beachmale",
    "beach",
    "police",
    "trampoline",
    "mannpc",
    "femalenpc",
    "ch",
    "bicyclenpc",
  ];
  for (const k of ordered) {
    void ensureGlbLoaded(k, false);
  }
}

export function preloadAllCharacterGlbs(priorityKey?: GlbRoleKey) {
  if (priorityKey) void ensureGlbLoaded(priorityKey, true);
  preloadCityNpcGlbs();
}

export function subscribeGlbRegistry(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function cloneGlbTemplate(tpl: GlbTemplate): THREE.Group {
  return skeletonClone(tpl.scene) as THREE.Group;
}

export function disposeClonedCharacter(
  clonedRoot: THREE.Group,
  tpl: GlbTemplate,
  animator: CharacterAnimator,
) {
  animator.dispose();
  clonedRoot.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry instanceof THREE.BufferGeometry && !tpl.protoGeometries.has(obj.geometry)) {
        obj.geometry.dispose();
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && !tpl.protoMaterials.has(m)) {
          m.dispose();
        }
      }
    }
  });
}

export type AnimIntent = "idle" | "walk" | "run" | "dance" | "sit" | "swim" | "bounce";

export interface CharacterAnimator {
  update: (
    dt: number,
    phase: number,
    t: number,
    speed: number,
    intent: AnimIntent,
    innerGroup: THREE.Group | null,
  ) => void;
  dispose: () => void;
}

function findBone(root: THREE.Object3D, rx: RegExp): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  root.traverse((obj) => {
    if (!found && obj instanceof THREE.Bone && rx.test(obj.name)) found = obj;
  });
  return found;
}

export function createCharacterAnimator(
  clonedRoot: THREE.Group,
  tpl: GlbTemplate,
  seedOffset = 0,
): CharacterAnimator {
  let bounceChild: THREE.Object3D | null = null;
  let bounceBaseY = 0;
  let bounceUnitsPerMeter = 1;
  if (tpl.key === "trampoline") {
    clonedRoot.updateMatrixWorld(true);
    clonedRoot.traverse((obj) => {
      if (!bounceChild && /girl|v28|jumper/i.test(obj.name)) {
        bounceChild = obj;
        bounceBaseY = obj.position.y;
        if (obj.parent) {
          obj.parent.getWorldScale(_tmpScale);
          bounceUnitsPerMeter = 1 / Math.max(Math.abs(_tmpScale.y), 0.0001);
        }
      }
    });
  }

  let mixer: THREE.AnimationMixer | null = null;
  const actions: Partial<Record<"idle" | "walk" | "run" | "dance" | "sit", THREE.AnimationAction>> =
    {};
  let activeKey: "idle" | "walk" | "run" | "dance" | "sit" | null = null;

  if (tpl.animations.length > 0) {
    mixer = new THREE.AnimationMixer(clonedRoot);
    const clips = tpl.animations;
    const pick = (rx: RegExp) => clips.find((c) => rx.test(c.name));
    const idleClip = pick(/idle|stand|breath/i) ?? clips[0];
    const walkClip = pick(/walk|stride/i) ?? idleClip;
    const runClip = pick(/run|sprint|jog/i) ?? walkClip;
    const danceClip = pick(/dance|groove|party/i) ?? walkClip;
    const sitClip = pick(/sit|chair|ride/i) ?? idleClip;

    if (idleClip) actions.idle = mixer.clipAction(idleClip);
    if (walkClip) actions.walk = mixer.clipAction(walkClip);
    if (runClip) actions.run = mixer.clipAction(runClip);
    if (danceClip) actions.dance = mixer.clipAction(danceClip);
    if (sitClip) actions.sit = mixer.clipAction(sitClip);

    if (actions.idle) {
      actions.idle.play();
      activeKey = "idle";
    }
  }

  // Optional multi-joint skeletal bone rig refs when no animation clips exist in the .glb
  const bones = !mixer
    ? {
        hips: findBone(clonedRoot, /hips|pelvis|root/i),
        spine: findBone(clonedRoot, /spine1|spine2|chest|spine/i),
        head: findBone(clonedRoot, /head/i),
        leftArm: findBone(clonedRoot, /left.*arm|upperarm_l|arm_l|l_upperarm|shoulder_l/i),
        rightArm: findBone(clonedRoot, /right.*arm|upperarm_r|arm_r|r_upperarm|shoulder_r/i),
        leftForeArm: findBone(clonedRoot, /left.*forearm|lowerarm_l|forearm_l|l_forearm/i),
        rightForeArm: findBone(clonedRoot, /right.*forearm|lowerarm_r|forearm_r|r_forearm/i),
        leftLeg: findBone(clonedRoot, /left.*upleg|thigh_l|upleg_l|l_thigh/i),
        rightLeg: findBone(clonedRoot, /right.*upleg|thigh_r|upleg_r|r_thigh/i),
        leftShin: findBone(clonedRoot, /left.*leg$|shin_l|calf_l|l_calf|knee_l/i),
        rightShin: findBone(clonedRoot, /right.*leg$|shin_r|calf_r|r_calf|knee_r/i),
      }
    : null;
  const hasBones = !!(
    bones &&
    (bones.leftLeg || bones.rightLeg || bones.leftArm || bones.rightArm || bones.spine)
  );
  const baseHipsY = bones?.hips?.position.y ?? 0;
  const baseHipsRotY = bones?.hips?.rotation.y ?? 0;
  const baseSpineX = bones?.spine?.rotation.x ?? 0;
  const baseSpineY = bones?.spine?.rotation.y ?? 0;
  const baseHeadY = bones?.head?.rotation.y ?? 0;
  const baseLArmX = bones?.leftArm?.rotation.x ?? 0;
  const baseRArmX = bones?.rightArm?.rotation.x ?? 0;
  const baseLForeX = bones?.leftForeArm?.rotation.x ?? 0;
  const baseRForeX = bones?.rightForeArm?.rotation.x ?? 0;
  const baseLLegX = bones?.leftLeg?.rotation.x ?? 0;
  const baseRLegX = bones?.rightLeg?.rotation.x ?? 0;
  const baseLShinX = bones?.leftShin?.rotation.x ?? 0;
  const baseRShinX = bones?.rightShin?.rotation.x ?? 0;

  return {
    update(dt, phase, t, speed, intent, innerGroup) {
      if (bounceChild) {
        const wave = Math.abs(Math.sin(t * 4.4 + seedOffset));
        bounceChild.position.y = bounceBaseY + wave * 0.52 * bounceUnitsPerMeter;
        if (innerGroup) {
          innerGroup.position.y = 0;
          innerGroup.rotation.set(0, 0, 0);
        }
        return;
      }

      if (mixer) {
        const nextKey: "idle" | "walk" | "run" | "dance" | "sit" =
          intent === "dance"
            ? "dance"
            : intent === "sit"
              ? "sit"
              : intent === "swim"
                ? "walk"
                : speed > 4.6
                  ? "run"
                  : speed > 0.25
                    ? "walk"
                    : "idle";
        if (nextKey !== activeKey) {
          const prev = activeKey ? actions[activeKey] : undefined;
          const next = actions[nextKey];
          if (next && next !== prev) {
            next.reset().setEffectiveWeight(1).fadeIn(0.18).play();
            prev?.fadeOut(0.18);
          }
          activeKey = nextKey;
        }
        const timeScale =
          intent === "swim"
            ? 1.15
            : intent === "walk" || intent === "run"
              ? Math.max(0.65, Math.min(1.6, speed / 3.6))
              : 0.9;
        mixer.update(dt * timeScale);
        if (innerGroup) {
          innerGroup.position.y = 0;
          innerGroup.scale.set(1, 1, 1);
          innerGroup.rotation.set(intent === "swim" ? 1.35 : 0, 0, 0);
        }
        return;
      }

      const moveAmp = speed > 0.15 ? Math.min(1, speed / 3.8) : 0;
      const isRun = intent === "run" || speed > 4.6;
      const strideGain = isRun ? 1.25 : 1.0;
      const swing = Math.sin(phase);
      const oppSwing = -swing;
      const dampLambda = 14;

      if (bones && hasBones) {
        let targetHipsY = baseHipsY;
        let targetHipsRotY = baseHipsRotY;
        let targetSpineX = baseSpineX;
        let targetSpineY = baseSpineY;
        let targetHeadY = baseHeadY;
        let targetLArmX = baseLArmX;
        let targetRArmX = baseRArmX;
        let targetLForeX = baseLForeX;
        let targetRForeX = baseRForeX;
        let targetLLegX = baseLLegX;
        let targetRLegX = baseRLegX;
        let targetLShinX = baseLShinX;
        let targetRShinX = baseRShinX;

        if (intent === "sit") {
          targetLLegX = baseLLegX - 1.3;
          targetRLegX = baseRLegX - 1.3;
          targetLShinX = baseLShinX + 1.25;
          targetRShinX = baseRShinX + 1.25;
          targetLArmX = baseLArmX - 0.35;
          targetRArmX = baseRArmX - 0.35;
          targetSpineX = baseSpineX + 0.05;
        } else if (intent === "dance") {
          const d = Math.sin(t * 6.5 + seedOffset);
          targetLArmX = baseLArmX - 0.72 + d * 0.42;
          targetRArmX = baseRArmX - 0.72 - d * 0.42;
          targetLForeX = baseLForeX - 0.48;
          targetRForeX = baseRForeX - 0.48;
          targetLLegX = baseLLegX + d * 0.16;
          targetRLegX = baseRLegX - d * 0.16;
          targetSpineY = baseSpineY + d * 0.14;
          targetSpineX = baseSpineX + Math.sin(t * 13) * 0.04;
          targetHeadY = baseHeadY + d * 0.1;
        } else if (intent === "swim") {
          const stroke = Math.sin(t * 5.2 + seedOffset);
          targetLArmX = baseLArmX - 1.4 + stroke * 0.75;
          targetRArmX = baseRArmX - 1.4 - stroke * 0.75;
          targetLLegX = baseLLegX + stroke * 0.45;
          targetRLegX = baseRLegX - stroke * 0.45;
        } else if (moveAmp > 0.05) {
          // Multi-joint human locomotion: opposite thigh/hip swing, knee bend on backswing,
          // counter-rotating upper-arm/shoulder swing, elbow bend, and subtle torso twist
          const legAmp = 0.56 * strideGain * moveAmp;
          const armAmp = 0.44 * strideGain * moveAmp;
          targetLLegX = baseLLegX + swing * legAmp;
          targetRLegX = baseRLegX + oppSwing * legAmp;
          // Knee bends positively during backswing / swing recovery
          targetLShinX = baseLShinX + Math.max(0, -swing) * 0.68 * strideGain * moveAmp;
          targetRShinX = baseRShinX + Math.max(0, -oppSwing) * 0.68 * strideGain * moveAmp;
          // Opposite upper arm swings forward with opposite leg
          targetLArmX = baseLArmX - swing * armAmp;
          targetRArmX = baseRArmX - oppSwing * armAmp;
          targetLForeX = baseLForeX - (0.22 + Math.max(0, -swing) * 0.35) * moveAmp;
          targetRForeX = baseRForeX - (0.22 + Math.max(0, -oppSwing) * 0.35) * moveAmp;
          // Subtle counter-rotation of hips & spine
          targetHipsRotY = baseHipsRotY + swing * 0.055 * moveAmp;
          targetSpineY = baseSpineY - swing * 0.065 * moveAmp;
          targetSpineX = baseSpineX + (isRun ? 0.09 : 0.03) * moveAmp;
          targetHipsY = baseHipsY + Math.abs(Math.cos(phase)) * 0.022 * moveAmp;
        } else {
          // Smooth idle breathing when stopped
          const breath = Math.sin(t * 2.1 + seedOffset);
          targetSpineX = baseSpineX + breath * 0.018;
          targetLArmX = baseLArmX + breath * 0.022;
          targetRArmX = baseRArmX - breath * 0.022;
          targetHeadY = baseHeadY + Math.sin(t * 0.8 + seedOffset) * 0.035;
        }

        if (bones.hips) {
          bones.hips.position.y = THREE.MathUtils.damp(
            bones.hips.position.y,
            targetHipsY,
            dampLambda,
            dt,
          );
          bones.hips.rotation.y = THREE.MathUtils.damp(
            bones.hips.rotation.y,
            targetHipsRotY,
            dampLambda,
            dt,
          );
        }
        if (bones.spine) {
          bones.spine.rotation.x = THREE.MathUtils.damp(
            bones.spine.rotation.x,
            targetSpineX,
            dampLambda,
            dt,
          );
          bones.spine.rotation.y = THREE.MathUtils.damp(
            bones.spine.rotation.y,
            targetSpineY,
            dampLambda,
            dt,
          );
        }
        if (bones.head)
          bones.head.rotation.y = THREE.MathUtils.damp(
            bones.head.rotation.y,
            targetHeadY,
            dampLambda,
            dt,
          );
        if (bones.leftArm)
          bones.leftArm.rotation.x = THREE.MathUtils.damp(
            bones.leftArm.rotation.x,
            targetLArmX,
            dampLambda,
            dt,
          );
        if (bones.rightArm)
          bones.rightArm.rotation.x = THREE.MathUtils.damp(
            bones.rightArm.rotation.x,
            targetRArmX,
            dampLambda,
            dt,
          );
        if (bones.leftForeArm)
          bones.leftForeArm.rotation.x = THREE.MathUtils.damp(
            bones.leftForeArm.rotation.x,
            targetLForeX,
            dampLambda,
            dt,
          );
        if (bones.rightForeArm)
          bones.rightForeArm.rotation.x = THREE.MathUtils.damp(
            bones.rightForeArm.rotation.x,
            targetRForeX,
            dampLambda,
            dt,
          );
        if (bones.leftLeg)
          bones.leftLeg.rotation.x = THREE.MathUtils.damp(
            bones.leftLeg.rotation.x,
            targetLLegX,
            dampLambda,
            dt,
          );
        if (bones.rightLeg)
          bones.rightLeg.rotation.x = THREE.MathUtils.damp(
            bones.rightLeg.rotation.x,
            targetRLegX,
            dampLambda,
            dt,
          );
        if (bones.leftShin)
          bones.leftShin.rotation.x = THREE.MathUtils.damp(
            bones.leftShin.rotation.x,
            targetLShinX,
            dampLambda,
            dt,
          );
        if (bones.rightShin)
          bones.rightShin.rotation.x = THREE.MathUtils.damp(
            bones.rightShin.rotation.x,
            targetRShinX,
            dampLambda,
            dt,
          );
      }

      if (innerGroup) {
        if (tpl.key === "trampoline") {
          innerGroup.position.y = Math.abs(Math.sin(t * 4.4 + seedOffset)) * 0.45;
          innerGroup.rotation.set(0, 0, 0);
          return;
        }
        // Keep characters strictly upright with zero plastic-toy side rocking/tilting
        const strideBob =
          intent === "dance"
            ? Math.abs(Math.sin(t * 6.8 + seedOffset)) * 0.035
            : hasBones || intent === "sit"
              ? 0
              : Math.abs(Math.sin(phase)) * 0.015 * moveAmp;
        const grooveYaw = intent === "dance" ? Math.sin(t * 3.4 + seedOffset) * 0.14 : 0;
        const leanX = intent === "swim" ? 1.35 : 0;
        const idleBreath =
          moveAmp < 0.05 && intent === "idle" ? 1 + Math.sin(t * 2.0 + seedOffset) * 0.004 : 1;
        innerGroup.scale.set(1, idleBreath, 1);
        innerGroup.position.y = strideBob;
        innerGroup.rotation.set(leanX, grooveYaw, 0);
      }
    },
    dispose() {
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(clonedRoot);
      }
    },
  };
}
