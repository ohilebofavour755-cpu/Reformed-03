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

// Serve all 10 .glb files directly from public/
export const GLB_PUBLIC_URLS: Record<GlbRoleKey, string[]> = {
  maleplayer: ["/Maleplayer.glb"],
  fplayer: ["/Fplayer.glb"],
  police: ["/police.glb", "/Police.glb"],
  mannpc: ["/Mannpc.glb"],
  femalenpc: ["/Femalenpc.glb"],
  ch: ["/C%26h.glb", "/C&h.glb"],
  beachmale: ["/Beachmale.glb"],
  beach: ["/Beach.glb"],
  trampoline: ["/trampoline.glb"],
  bicyclenpc: ["/bicyclenpc.glb"],
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

const REAL_GLB_ALIAS: Record<GlbRoleKey, GlbRoleKey[]> = {
  maleplayer: ["beachmale", "police", "beach"],
  fplayer: ["beach", "beachmale"],
  police: ["beachmale", "beach"],
  mannpc: ["beachmale", "beach"],
  femalenpc: ["beach", "beachmale"],
  ch: ["beach", "beachmale"],
  beachmale: ["beach"],
  beach: ["beachmale"],
  trampoline: ["beach"],
  bicyclenpc: ["beachmale", "beach"],
};

export interface GlbTemplate {
  key: GlbRoleKey;
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  height: number;
}

const cache = new Map<GlbRoleKey, GlbTemplate | null>();
const inflight = new Map<GlbRoleKey, Promise<GlbTemplate | null>>();
const listeners = new Set<() => void>();

let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const loader = new GLTFLoader();
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
        materialParams.color = new THREE.Color(r, g, b);
        materialParams.opacity = a;
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
      materialParams.roughness = Math.max(0.25, Math.min(0.95, 1 - gloss * 0.65));
      materialParams.metalness = 0.08;
      return Promise.all(pending);
    },
  }));
  sharedLoader = loader;
  return loader;
}

async function isRealGlbUrl(url: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-15" } });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (ct.includes("text/html") || ct.includes("application/xhtml")) return false;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 4) return false;
    const bytes = new Uint8Array(buf);
    const isGlbMagic =
      bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
    const isJson = bytes[0] === 0x7b;
    return isGlbMagic || isJson;
  } catch {
    return false;
  }
}

async function resolveGlbUrl(key: GlbRoleKey): Promise<string | null> {
  for (const url of GLB_PUBLIC_URLS[key]) {
    if (await isRealGlbUrl(url)) return url;
  }
  return null;
}

function normalizeScene(raw: THREE.Group, targetHeight: number): THREE.Group {
  raw.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(raw);
  const dim = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = targetHeight / Math.max(dim.y, 0.001);

  raw.scale.setScalar(s);
  raw.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  raw.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = !(obj instanceof THREE.SkinnedMesh);
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(raw);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

export function getCachedGlb(key: GlbRoleKey): GlbTemplate | null {
  return cache.get(key) ?? null;
}

export function getCachedGlbWithFallback(key: GlbRoleKey): GlbTemplate | null {
  const exact = cache.get(key);
  if (exact) return exact;
  for (const alt of REAL_GLB_ALIAS[key]) {
    const found = cache.get(alt);
    if (found) return found;
  }
  return null;
}

export function ensureGlbLoaded(key: GlbRoleKey): Promise<GlbTemplate | null> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const url = await resolveGlbUrl(key);
    if (!url) {
      cache.set(key, null);
      return null;
    }
    try {
      const gltf = await getLoader().loadAsync(url);
      const height = TARGET_HEIGHT[key];
      const scene = normalizeScene(gltf.scene, height);
      const tpl: GlbTemplate = {
        key,
        url,
        scene,
        animations: gltf.animations ?? [],
        height,
      };
      cache.set(key, tpl);
      listeners.forEach((fn) => fn());
      return tpl;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function preloadAllCharacterGlbs() {
  const keys: GlbRoleKey[] = [
    "maleplayer",
    "fplayer",
    "police",
    "mannpc",
    "femalenpc",
    "ch",
    "beachmale",
    "beach",
    "trampoline",
    "bicyclenpc",
  ];
  for (const k of keys) void ensureGlbLoaded(k);
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
  if (tpl.key === "trampoline") {
    clonedRoot.traverse((obj) => {
      if (!bounceChild && /girl|v28|jumper/i.test(obj.name)) {
        bounceChild = obj;
        bounceBaseY = obj.position.y;
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

  // Optional skeletal bone rig refs when no animation clips exist in the .glb
  const bones = !mixer
    ? {
        spine: findBone(clonedRoot, /spine1|spine/i),
        leftArm: findBone(clonedRoot, /left.*arm|upperarm_l|arm_l|l_upperarm/i),
        rightArm: findBone(clonedRoot, /right.*arm|upperarm_r|arm_r|r_upperarm/i),
        leftLeg: findBone(clonedRoot, /left.*upleg|thigh_l|leg_l|l_thigh/i),
        rightLeg: findBone(clonedRoot, /right.*upleg|thigh_r|leg_r|r_thigh/i),
      }
    : null;
  const baseSpineX = bones?.spine?.rotation.x ?? 0;
  const baseLArmX = bones?.leftArm?.rotation.x ?? 0;
  const baseRArmX = bones?.rightArm?.rotation.x ?? 0;
  const baseLLegX = bones?.leftLeg?.rotation.x ?? 0;
  const baseRLegX = bones?.rightLeg?.rotation.x ?? 0;

  return {
    update(dt, phase, t, speed, intent, innerGroup) {
      if (bounceChild) {
        const wave = Math.abs(Math.sin(t * 4.4 + seedOffset));
        bounceChild.position.y = bounceBaseY + wave * 0.9;
        return;
      }

      if (mixer) {
        const nextKey: "idle" | "walk" | "run" | "dance" | "sit" =
          intent === "dance"
            ? "dance"
            : intent === "sit"
              ? "sit"
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
        mixer.update(dt * (speed > 0.2 ? Math.min(1.4, 0.8 + speed * 0.08) : 0.85));
        if (innerGroup) {
          innerGroup.position.y = 0;
          innerGroup.rotation.set(intent === "swim" ? 1.35 : 0, 0, 0);
        }
        return;
      }

      const moveAmp = speed > 0.15 ? Math.min(1, speed / 3.5) : 0;
      const swing = Math.sin(phase);

      // Animate skeletal bones smoothly if the .glb carries a rig without clips
      if (bones && (bones.leftLeg || bones.rightLeg || bones.leftArm || bones.rightArm)) {
        if (intent === "sit") {
          if (bones.leftLeg) bones.leftLeg.rotation.x = baseLLegX - 1.3;
          if (bones.rightLeg) bones.rightLeg.rotation.x = baseRLegX - 1.3;
          if (bones.leftArm) bones.leftArm.rotation.x = baseLArmX - 0.35;
          if (bones.rightArm) bones.rightArm.rotation.x = baseRArmX - 0.35;
          if (bones.spine) bones.spine.rotation.x = baseSpineX + 0.05;
        } else if (intent === "dance") {
          const d = Math.sin(t * 6.5 + seedOffset);
          if (bones.leftArm) bones.leftArm.rotation.x = baseLArmX - 0.75 + d * 0.45;
          if (bones.rightArm) bones.rightArm.rotation.x = baseRArmX - 0.75 - d * 0.45;
          if (bones.leftLeg) bones.leftLeg.rotation.x = baseLLegX + d * 0.18;
          if (bones.rightLeg) bones.rightLeg.rotation.x = baseRLegX - d * 0.18;
          if (bones.spine) bones.spine.rotation.x = baseSpineX + Math.sin(t * 13) * 0.06;
        } else {
          const breath = Math.sin(t * 2.1 + seedOffset) * 0.03;
          if (bones.leftLeg) bones.leftLeg.rotation.x = baseLLegX + swing * 0.55 * moveAmp;
          if (bones.rightLeg) bones.rightLeg.rotation.x = baseRLegX - swing * 0.55 * moveAmp;
          if (bones.leftArm) bones.leftArm.rotation.x = baseLArmX - swing * 0.45 * moveAmp + breath;
          if (bones.rightArm)
            bones.rightArm.rotation.x = baseRArmX + swing * 0.45 * moveAmp - breath;
          if (bones.spine) bones.spine.rotation.x = baseSpineX + 0.04 * moveAmp;
        }
      }

      if (innerGroup) {
        if (tpl.key === "trampoline") {
          innerGroup.position.y = Math.abs(Math.sin(t * 4.4 + seedOffset)) * 0.45;
          innerGroup.rotation.set(0, 0, 0);
          return;
        }
        const strideBob =
          intent === "dance"
            ? Math.abs(Math.sin(t * 7.2 + seedOffset)) * 0.055
            : Math.abs(swing) * 0.045 * moveAmp;
        const swayZ =
          intent === "dance" ? Math.sin(t * 6.5 + seedOffset) * 0.08 : swing * 0.032 * moveAmp;
        const leanX =
          intent === "swim" ? 1.35 : intent === "bounce" ? 0 : moveAmp > 0 ? 0.03 * moveAmp : 0;
        const breathScale = 1 + Math.sin(t * 2.2 + seedOffset) * 0.008;
        innerGroup.scale.set(1, breathScale, 1);
        innerGroup.position.y = strideBob;
        innerGroup.rotation.set(leanX, 0, swayZ);
      }
    },
    dispose() {
      mixer?.stopAllAction();
    },
  };
}
