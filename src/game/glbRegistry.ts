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
  | "bicycle";

const CANDIDATE_NAMES: Record<GlbRoleKey, string[]> = {
  maleplayer: ["Maleplayer.glb", "maleplayer.glb"],
  fplayer: ["Fplayer.glb", "fplayer.glb"],
  police: ["Police.glb", "police.glb"],
  mannpc: ["Mannpc.glb", "mannpc.glb"],
  femalenpc: ["Femalenpc.glb", "femalenpc.glb"],
  ch: ["C&h.glb", "c&h.glb"],
  beachmale: ["Beachmale.glb", "beachmale.glb"],
  beach: ["Beach.glb", "beach.glb"],
  trampoline: ["trampoline.glb", "Trampoline.glb"],
  bicycle: ["bicycle.glb", "Bicycle.glb"],
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
  bicycle: 1.08,
};

const rootGlbs = import.meta.glob<string>("/*.glb", {
  eager: true,
  query: "?url",
  import: "default",
});

const modelsGlbs = import.meta.glob<string>("/models/*.glb", {
  eager: true,
  query: "?url",
  import: "default",
});

const assetPointers = import.meta.glob<{ default: { url: string; original_filename?: string } }>(
  "../assets/models/*.asset.json",
  { eager: true },
);

const bundledByLowerName = new Map<string, string>();
for (const [path, url] of Object.entries(rootGlbs)) {
  const base = path.split("/").pop();
  if (base && typeof url === "string") bundledByLowerName.set(base.toLowerCase(), url);
}
for (const [path, url] of Object.entries(modelsGlbs)) {
  const base = path.split("/").pop();
  if (base && typeof url === "string" && !bundledByLowerName.has(base.toLowerCase())) {
    bundledByLowerName.set(base.toLowerCase(), url);
  }
}
for (const [path, mod] of Object.entries(assetPointers)) {
  const url = mod?.default?.url;
  const orig = mod?.default?.original_filename;
  if (typeof url === "string") {
    if (orig && !bundledByLowerName.has(orig.toLowerCase())) {
      bundledByLowerName.set(orig.toLowerCase(), url);
    }
    const base = path.split("/").pop()?.replace(".asset.json", "");
    if (base && !bundledByLowerName.has(base.toLowerCase())) {
      bundledByLowerName.set(base.toLowerCase(), url);
    }
  }
}

export interface GlbTemplate {
  key: GlbRoleKey;
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
    // Binary glTF ("glTF") or JSON glTF ("{")
    const isGlbMagic =
      bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
    const isJson = bytes[0] === 0x7b;
    return isGlbMagic || isJson;
  } catch {
    return false;
  }
}

async function resolveGlbUrl(key: GlbRoleKey): Promise<string | null> {
  const names = CANDIDATE_NAMES[key];
  // 1. Check Vite-bundled glob or asset pointers first
  for (const name of names) {
    const found = bundledByLowerName.get(name.toLowerCase());
    if (found && (await isRealGlbUrl(found))) return found;
  }
  // 2. Probe standard web paths (/, /models/, /public/) cleanly
  for (const name of names) {
    const enc = encodeURIComponent(name);
    for (const url of [`/${enc}`, `/models/${enc}`, `/public/${enc}`]) {
      if (await isRealGlbUrl(url)) return url;
    }
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
      obj.frustumCulled = true;
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
    "bicycle",
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
