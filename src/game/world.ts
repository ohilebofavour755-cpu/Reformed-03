// City layout: an endless grid of blocks. Pure functions only.
import type { BuildingKind } from "./sim/interiors";

export const B = 32; // block pitch; roads run along x/z = k*B + B/2
export const WATER_X = 80; // river/sea east of here
export const BEACH_X = 53;
export const LANDMARK_HALF = 9;

export type Landmark =
  | "home"
  | "market"
  | "boutique"
  | "ink"
  | "realtor"
  | "school"
  | "church"
  | "club"
  | "police"
  | "chill"
  | "dealer";
export const LANDMARK_CHUNKS: Record<Landmark, [number, number]> = {
  home: [0, 0],
  market: [1, 0],
  boutique: [0, 1],
  ink: [0, 2],
  realtor: [-1, 0],
  school: [0, -1],
  church: [1, -1],
  club: [1, 1],
  police: [-1, 1],
  chill: [2, 0],
  dealer: [-1, -1],
};
export const LANDMARK_TITLE: Record<Landmark, string> = {
  home: "🏠 Your Apartment",
  market: "🧺 Balogun Supermarket",
  boutique: "👗 Ada's Boutique & Salon",
  ink: "🖋️ Ink Studio",
  realtor: "🏢 Prime Realtors",
  school: "🎓 City High School",
  church: "⛪ Grace Cathedral",
  club: "🎶 Club Amapiano",
  police: "🚓 Police Station",
  chill: "🏖️ Beach Chill Spot",
  dealer: "🚘 City Motors",
};
const SOLID: Record<Landmark, boolean> = {
  home: true,
  market: true,
  boutique: true,
  ink: true,
  realtor: true,
  school: true,
  church: true,
  club: true,
  police: true,
  chill: false,
  dealer: true,
};
const BY_KEY = new Map<string, Landmark>(
  (Object.entries(LANDMARK_CHUNKS) as [Landmark, [number, number]][]).map(([k, [x, z]]) => [
    `${x},${z}`,
    k,
  ]),
);

// Exterior physical entrance door coordinates & spawn point just outside the door
export const BUILDING_DOORS: Record<
  BuildingKind,
  { doorX: number; doorZ: number; outX: number; outZ: number; outHeading: number; label: string }
> = {
  home: { doorX: 0, doorZ: 8.2, outX: 0, outZ: 10.6, outHeading: 0, label: "Your Apartment" },
  market: {
    doorX: 32,
    doorZ: 8.2,
    outX: 32,
    outZ: 10.2,
    outHeading: 0,
    label: "Balogun Supermarket",
  },
  boutique: {
    doorX: 0,
    doorZ: 41.2,
    outX: 0,
    outZ: 43.0,
    outHeading: 0,
    label: "Ada's Boutique & Salon",
  },
  ink: { doorX: 0, doorZ: 73.2, outX: 0, outZ: 75.0, outHeading: 0, label: "Ink Studio" },
  club: {
    doorX: 20.5,
    doorZ: 32,
    outX: 18.6,
    outZ: 32,
    outHeading: -Math.PI / 2,
    label: "Club Amapiano",
  },
  realtor: {
    doorX: -32,
    doorZ: 9.2,
    outX: -32,
    outZ: 11.0,
    outHeading: 0,
    label: "Prime Realtors",
  },
  school: {
    doorX: 0,
    doorZ: -27.5,
    outX: 0,
    outZ: -25.6,
    outHeading: 0,
    label: "City High School",
  },
  church: {
    doorX: 32,
    doorZ: -25.7,
    outX: 32,
    outZ: -23.8,
    outHeading: 0,
    label: "Grace Cathedral",
  },
  dealer: { doorX: -32, doorZ: -26.0, outX: -32, outZ: -24.0, outHeading: 0, label: "City Motors" },
  police: {
    doorX: -32,
    doorZ: 41.2,
    outX: -32,
    outZ: 43.0,
    outHeading: 0,
    label: "Police Station",
  },
};

export function nearBuildingDoor(x: number, z: number): BuildingKind | null {
  let best: BuildingKind | null = null;
  let dist = 3.2;
  for (const [kind, d] of Object.entries(BUILDING_DOORS) as [
    BuildingKind,
    (typeof BUILDING_DOORS)[BuildingKind],
  ][]) {
    const distToDoor = Math.hypot(x - d.doorX, z - d.doorZ);
    const distToOut = Math.hypot(x - d.outX, z - d.outZ);
    const m = Math.min(distToDoor, distToOut);
    if (m < dist) {
      dist = m;
      best = kind;
    }
  }
  return best;
}

// Public Restroom building near Beach Chill Spot / plaza (chunk [2, 0])
export const PUBLIC_RESTROOM = {
  x: 56,
  z: -12,
  hx: 3.2,
  hz: 2.6,
  doorX: 56,
  doorZ: -9.4,
  doorHalfW: 0.9,
};

export const ROAD_SAFETY_POSTS = [
  { id: "frsc-home", x: 10.6, z: 10.8, rotY: 0, label: "FRSC · 40 KM/H" },
  { id: "frsc-downtown", x: -10.6, z: 10.8, rotY: 0, label: "ROAD SAFETY" },
  { id: "frsc-coast", x: 42.6, z: -10.8, rotY: Math.PI, label: "COAST SAFETY" },
] as const;

export interface CitySeat {
  id: string;
  label: string;
  x: number;
  z: number;
  heading: number;
  sitY: number;
  exitX: number;
  exitZ: number;
}

const CHILL_CENTER = { x: 2 * B, z: 0 };
const CLUB_CENTER = { x: 1 * B, z: 1 * B };

export const CITY_SEATS: CitySeat[] = [
  // 5 Beach Loungers at Beach Chill Spot (facing +X ocean)
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `lounger-${i}`,
    label: "🌴 Sit / Relax",
    x: CHILL_CENTER.x + 11.4,
    z: CHILL_CENTER.z - 10 + i * 5,
    heading: Math.PI / 2,
    sitY: 0.02,
    exitX: CHILL_CENTER.x + 9.6,
    exitZ: CHILL_CENTER.z - 10 + i * 5,
  })),
  // 2 Shaded Benches near Chill Spot hut
  {
    id: "chill-bench-n",
    label: "🌴 Sit / Relax",
    x: CHILL_CENTER.x - 4,
    z: CHILL_CENTER.z - 3.2,
    heading: Math.PI,
    sitY: 0.02,
    exitX: CHILL_CENTER.x - 4,
    exitZ: CHILL_CENTER.z - 4.8,
  },
  {
    id: "chill-bench-s",
    label: "🌴 Sit / Relax",
    x: CHILL_CENTER.x - 4,
    z: CHILL_CENTER.z + 3.2,
    heading: 0,
    sitY: 0.02,
    exitX: CHILL_CENTER.x - 4,
    exitZ: CHILL_CENTER.z + 4.8,
  },
];

export function nearestCitySeat(x: number, z: number): CitySeat | null {
  let best: CitySeat | null = null;
  let dist = 2.3;
  for (const s of CITY_SEATS) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best;
}

export function insidePublicRestroom(x: number, z: number): boolean {
  return (
    x > PUBLIC_RESTROOM.x - PUBLIC_RESTROOM.hx + 0.25 &&
    x < PUBLIC_RESTROOM.x + PUBLIC_RESTROOM.hx - 0.25 &&
    z > PUBLIC_RESTROOM.z - PUBLIC_RESTROOM.hz + 0.25 &&
    z < PUBLIC_RESTROOM.z + PUBLIC_RESTROOM.hz - 0.2
  );
}

export function publicRestroomDoorShouldOpen(x: number, z: number, locked: boolean): boolean {
  if (locked) return false;
  const dist = Math.hypot(x - PUBLIC_RESTROOM.doorX, z - PUBLIC_RESTROOM.doorZ);
  if (insidePublicRestroom(x, z)) return dist < 1.35;
  return dist < 1.9;
}

export function isNearClubBar(x: number, z: number): boolean {
  const lx = x - CLUB_CENTER.x;
  const lz = z - CLUB_CENTER.z;
  return Math.abs(lx) < 4.8 && lz > -10.4 && lz < -6.4;
}

export function isOnDanceFloor(x: number, z: number): boolean {
  const lx = x - CLUB_CENTER.x;
  const lz = z - CLUB_CENTER.z;
  return Math.abs(lx) < 9.2 && lz > -6.4 && lz < 9.5;
}

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

const PALETTE = [
  "#e9c9a0",
  "#d98b5f",
  "#f2e3c6",
  "#9fb8ad",
  "#c9d6df",
  "#e7b75a",
  "#b56a4f",
  "#f0d9da",
  "#8aa6c1",
  "#d7c49e",
];
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
  const cx = chunkOf(p.x);
  const cz = chunkOf(p.z);
  const half = solidHalf(cx, cz);
  if (half == null) return;
  const lx = p.x - cx * B;
  const lz = p.z - cz * B;
  const h = half + r;
  if (Math.abs(lx) < h && Math.abs(lz) < h) {
    const px = h - Math.abs(lx);
    const pz = h - Math.abs(lz);
    if (px < pz) p.x += Math.sign(lx || 1) * px;
    else p.z += Math.sign(lz || 1) * pz;
  }
}

function buildingEnvelope(l: Landmark): { hx: number; hz: number; z: number } {
  switch (l) {
    case "home":
      return { hx: 8, hz: 8, z: 0 };
    case "market":
      return { hx: 9, hz: 8, z: 0 };
    case "school":
      return { hx: 9, hz: 6.5, z: -2 };
    case "church":
      return { hx: 7, hz: 6.5, z: -2 };
    case "club":
      return { hx: 11.5, hz: 11.5, z: 0 };
    case "dealer":
      return { hx: 9, hz: 7, z: -1 };
    default:
      return { hx: 9, hz: 9, z: 0 };
  }
}

export function cityBlocked(
  x: number,
  z: number,
  radius = 0.4,
  restroomDoorLocked = false,
): boolean {
  const cx = chunkOf(x);
  const cz = chunkOf(z);
  for (let a = cx - 1; a <= cx + 1; a++)
    for (let b = cz - 1; b <= cz + 1; b++) {
      const kind = chunkKind(a, b);
      const l = landmarkAt(a, b);
      const lx = x - a * B;
      const lz = z - b * B;
      if (kind !== "water" && kind !== "beach" && Math.hypot(lx - 10.4, lz - 10.4) < 0.1 + radius)
        return true;
      if (
        kind === "building" &&
        (Math.hypot(lx - 10, lz + 5) < 0.22 + radius || Math.hypot(lx + 10, lz - 5) < 0.22 + radius)
      )
        return true;
      if (kind === "park")
        for (let i = 0; i < 6; i++) {
          if (
            Math.hypot(lx - (hash2(a + i, b) - 0.5) * 15, lz - (hash2(b - i, a) - 0.5) * 15) <
            0.35 + radius
          )
            return true;
        }
      if (
        kind === "beach" &&
        (Math.hypot(lx - 8, lz + 8) < 0.35 + radius || Math.hypot(lx - 2, lz - 9) < 0.35 + radius)
      )
        return true;
      if (kind === "building") {
        const h = building(a, b).half + radius;
        if (Math.abs(lx) < h && Math.abs(lz) < h) return true;
      }
      if (l && SOLID[l]) {
        const shape = buildingEnvelope(l);
        if (Math.abs(lx) < shape.hx + radius && Math.abs(lz - shape.z) < shape.hz + radius)
          return true;
        if (l === "church" && Math.abs(lx) < 2.25 + radius && Math.abs(lz - 4) < 2.25 + radius)
          return true;
      }
    }

  // Public Restroom building collision near Beach Chill Spot
  const rx = x - PUBLIC_RESTROOM.x;
  const rz = z - PUBLIC_RESTROOM.z;
  if (Math.abs(rx) < PUBLIC_RESTROOM.hx + 1.5 && Math.abs(rz) < PUBLIC_RESTROOM.hz + 1.5) {
    if (
      Math.abs(rx) < PUBLIC_RESTROOM.hx + radius &&
      Math.abs(rz + PUBLIC_RESTROOM.hz) < 0.16 + radius
    )
      return true;
    if (
      Math.abs(rx + PUBLIC_RESTROOM.hx) < 0.16 + radius &&
      Math.abs(rz) < PUBLIC_RESTROOM.hz + radius
    )
      return true;
    if (
      Math.abs(rx - PUBLIC_RESTROOM.hx) < 0.16 + radius &&
      Math.abs(rz) < PUBLIC_RESTROOM.hz + radius
    )
      return true;
    if (Math.abs(rz - PUBLIC_RESTROOM.hz) < 0.16 + radius) {
      if (
        Math.abs(rx) > PUBLIC_RESTROOM.doorHalfW - radius &&
        Math.abs(rx) < PUBLIC_RESTROOM.hx + radius
      )
        return true;
      if (restroomDoorLocked && Math.abs(rx) <= PUBLIC_RESTROOM.doorHalfW + radius) return true;
    }
    if (Math.abs(rx) < 0.1 + radius && rz < -0.6 + radius && rz > -PUBLIC_RESTROOM.hz) return true;
    if (Math.abs(rx + 1.8) < 0.45 + radius && Math.abs(rz + 1.3) < 0.5 + radius) return true;
    if (Math.abs(rx - 1.8) < 0.45 + radius && Math.abs(rz + 1.3) < 0.5 + radius) return true;
  }

  for (const post of ROAD_SAFETY_POSTS) {
    if (Math.hypot(x - post.x, z - post.z) < 0.45 + radius) return true;
  }

  return false;
}

// Strict asphalt-only road check for vehicles: keeps vehicles off beach sand, ocean, and sidewalks.
export function onAsphaltRoad(x: number, z: number, radius = 1.0): boolean {
  if (x > BEACH_X - 1.1 - radius || x > WATER_X - 4) return false;
  const rx = Math.round((x - B / 2) / B) * B + B / 2;
  const rz = Math.round((z - B / 2) / B) * B + B / 2;
  const halfAsphalt = 5.0 - Math.min(1.4, radius * 0.45);
  return Math.abs(x - rx) <= halfAsphalt || Math.abs(z - rz) <= halfAsphalt;
}

export function vehicleRoadBlocked(
  x: number,
  z: number,
  radius = 1.1,
  restroomDoorLocked = false,
): boolean {
  if (!onAsphaltRoad(x, z, radius)) return true;
  return cityBlocked(x, z, radius, restroomDoorLocked);
}

export function placeAt(x: number, z: number): Landmark | null {
  if (x > WATER_X + 12) return null;
  const cx = chunkOf(Math.min(x, WATER_X - 1));
  const cz = chunkOf(z);
  const l = landmarkAt(cx, cz);
  if (!l) return null;
  const d = Math.max(Math.abs(x - cx * B), Math.abs(z - cz * B));
  return d < LANDMARK_HALF + 6 || !SOLID[l] ? l : null;
}
