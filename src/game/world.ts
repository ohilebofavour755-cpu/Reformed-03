// City layout: an endless grid of blocks. Pure functions only.
export const B = 32; // block pitch; roads run along x/z = k*B + B/2
export const WATER_X = 80; // river/sea east of here
export const BEACH_X = 53;
export const LANDMARK_HALF = 9;

export type Landmark = "home" | "market" | "boutique" | "realtor" | "school" | "church" | "club" | "police" | "chill" | "dealer";
export const LANDMARK_CHUNKS: Record<Landmark, [number, number]> = {
  home: [0, 0], market: [1, 0], boutique: [0, 1], realtor: [-1, 0], school: [0, -1],
  church: [1, -1], club: [1, 1], police: [-1, 1], chill: [2, 0],
  dealer: [-1, -1],
};
export const LANDMARK_TITLE: Record<Landmark, string> = {
  home: "🏠 Your Apartment", market: "🧺 Central Market", boutique: "👗 Ada's Boutique & Salon",
  realtor: "🏢 Prime Realtors", school: "🎓 City High School", church: "⛪ Grace Cathedral",
  club: "🎶 Club Amapiano", police: "🚓 Police Station", chill: "🏖️ Beach Chill Spot",
  dealer: "🚘 City Motors",
};
const SOLID: Record<Landmark, boolean> = {
  home: true, market: false, boutique: true, realtor: true, school: true, church: true,
  club: false, police: true, chill: false,
  dealer: false,
};
const BY_KEY = new Map<string, Landmark>(
  (Object.entries(LANDMARK_CHUNKS) as [Landmark, [number, number]][]).map(([k, [x, z]]) => [`${x},${z}`, k]),
);

export function hash2(x: number, z: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const chunkOf = (v: number) => Math.round(v / B);
export const landmarkAt = (cx: number, cz: number) => BY_KEY.get(`${cx},${cz}`) ?? null;
export function landmarkCenter(l: Landmark) {
  const [cx, cz] = LANDMARK_CHUNKS[l];
  return { x: cx * B, z: cz * B };
}

export type Kind = "water" | "beach" | "landmark" | "park" | "building";
export function chunkKind(cx: number, cz: number): Kind {
  if (cx >= 3) return "water";
  if (landmarkAt(cx, cz)) return "landmark";
  if (cx === 2) return "beach";
  return hash2(cx + 11, cz - 5) < 0.12 ? "park" : "building";
}

const PALETTE = ["#e9c9a0", "#d98b5f", "#f2e3c6", "#9fb8ad", "#c9d6df", "#e7b75a", "#b56a4f", "#f0d9da", "#8aa6c1", "#d7c49e"];
export function building(cx: number, cz: number) {
  const r = hash2(cx, cz);
  const r2 = hash2(cz + 91, cx - 37);
  return {
    half: 7.5 + r2 * 1.5,
    h: 7 + r * r * 40,
    color: PALETTE[Math.floor(hash2(cx * 7 + 3, cz * 13 + 1) * PALETTE.length)] ?? "#e9c9a0",
  };
}

function solidHalf(cx: number, cz: number): number | null {
  const k = chunkKind(cx, cz);
  if (k === "building") return building(cx, cz).half;
  if (k === "landmark") {
    const l = landmarkAt(cx, cz);
    return l && SOLID[l] ? LANDMARK_HALF : null;
  }
  return null;
}

export function resolveCollision(p: { x: number; z: number }, r = 0.4) {
  const cx = chunkOf(p.x), cz = chunkOf(p.z);
  const half = solidHalf(cx, cz);
  if (half == null) return;
  const lx = p.x - cx * B, lz = p.z - cz * B, h = half + r;
  if (Math.abs(lx) < h && Math.abs(lz) < h) {
    const px = h - Math.abs(lx), pz = h - Math.abs(lz);
    if (px < pz) p.x += Math.sign(lx || 1) * px;
    else p.z += Math.sign(lz || 1) * pz;
  }
}

// Same exterior envelopes as the rendered meshes; narrow props and club walls are also solid.
export function cityBlocked(x: number, z: number, radius = 0.4): boolean {
  const cx = chunkOf(x), cz = chunkOf(z);
  for (let a = cx - 1; a <= cx + 1; a++) for (let b = cz - 1; b <= cz + 1; b++) {
    const kind = chunkKind(a, b), l = landmarkAt(a, b), lx = x - a * B, lz = z - b * B;
    if (kind !== "water" && kind !== "beach" && Math.hypot(lx - 10.4, lz - 10.4) < 0.1 + radius) return true;
    if (kind === "building" && (Math.hypot(lx - 10, lz + 5) < 0.22 + radius || Math.hypot(lx + 10, lz - 5) < 0.22 + radius)) return true;
    if (kind === "park") for (let i = 0; i < 6; i++) {
      if (Math.hypot(lx - (hash2(a + i, b) - 0.5) * 15, lz - (hash2(b - i, a) - 0.5) * 15) < 0.35 + radius) return true;
    }
    if (kind === "beach" && (Math.hypot(lx - 8, lz + 8) < 0.35 + radius || Math.hypot(lx - 2, lz - 9) < 0.35 + radius)) return true;
    if (kind === "building") { const h = building(a, b).half + radius; if (Math.abs(lx) < h && Math.abs(lz) < h) return true; }
    if (l && SOLID[l]) {
      const shape = l === "home" ? { hx: 8, hz: 8, z: 0 } : l === "school" ? { hx: 9, hz: 6.5, z: -2 } : l === "church" ? { hx: 7, hz: 6.5, z: -2 } : { hx: 9, hz: 9, z: 0 };
      if (Math.abs(lx) < shape.hx + radius && Math.abs(lz - shape.z) < shape.hz + radius) return true;
      if (l === "church" && Math.abs(lx) < 2.25 + radius && Math.abs(lz - 4) < 2.25 + radius) return true;
    }
    if (l === "club") {
      if (Math.abs(lx) < 12 + radius && Math.abs(Math.abs(lz) - 11.5) < 0.25 + radius) return true;
      if (Math.abs(lx + 11.5) < 0.25 + radius && Math.abs(lz) > 2.5 - radius && Math.abs(lz) < 11.5 + radius) return true;
      if (Math.abs(lx - 11) < 2 + radius && Math.abs(lz) < 6 + radius) return true;
    }
    if (l === "market") for (let i = 0; i < 6; i++) {
      if (Math.abs(lx - (i % 3 - 1) * 7) < 2 + radius && Math.abs(lz - (Math.floor(i / 3) - 0.5) * 9) < 1 + radius) return true;
    }
  }
  return false;
}

export function placeAt(x: number, z: number): Landmark | null {
  if (x > WATER_X + 12) return null;
  const cx = chunkOf(Math.min(x, WATER_X - 1)), cz = chunkOf(z);
  const l = landmarkAt(cx, cz);
  if (!l) return null;
  const d = Math.max(Math.abs(x - cx * B), Math.abs(z - cz * B));
  return d < LANDMARK_HALF + 5 || !SOLID[l] ? l : null;
}
