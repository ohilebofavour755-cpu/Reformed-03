import { HOUSES } from "../rules";

export type Station =
  | "bed"
  | "sofa"
  | "kitchen"
  | "fridge"
  | "dining"
  | "desk"
  | "wardrobe"
  | "bathroom"
  | "terrace"
  | "garage"
  | "door";

export interface Rect {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

export interface SeatSnap {
  id: string;
  title: string;
  seatX: number;
  seatZ: number;
  heading: number;
  sitY: number;
  exitX: number;
  exitZ: number;
  kind: "sit" | "sleep";
}

export const ROOM = { hx: 7, hz: 6 };

// Enclosed bathroom occupies the SW corner: x in [-7, -3.8], z in [2.4, 6.0].
// Doorway sits along x = -3.8 for z in [3.35, 4.65].
export const BATH_WALLS: Rect[] = [
  { x: -5.4, z: 2.4, hx: 1.6, hz: 0.12 },
  { x: -3.8, z: 2.88, hx: 0.12, hz: 0.48 },
  { x: -3.8, z: 5.32, hx: 0.12, hz: 0.68 },
];

export const BATH_DOOR = { x: -3.8, z: 4.0, hingeZ: 3.35, width: 1.3 };

// East partition wall along x = 7.0 with sliding glass doors at z in [-2.3, -0.3]
// and garage access doorway at z in [3.5, 5.0].
export const EAST_DIVIDER_WALLS: Rect[] = [
  { x: 7.0, z: -4.15, hx: 0.12, hz: 1.85 }, // North segment to sliding glass door
  { x: 7.0, z: 1.6, hx: 0.12, hz: 1.9 }, // Middle segment (covers z=2.0 for wall test parity)
  { x: 7.0, z: 5.5, hx: 0.12, hz: 0.5 }, // South garage corner pillar
];

export const TERRACE_BOUNDS = (houseTier = 0) => {
  const w = HOUSES[Math.min(HOUSES.length - 1, Math.max(0, houseTier))]?.terraceW ?? 4.6;
  return { minX: 7.0, maxX: 7.0 + w, minZ: -5.7, maxZ: 1.2, width: w };
};

export const GARAGE_BOUNDS = { minX: 7.0, maxX: 12.2, minZ: 1.4, maxZ: 5.8 };

export const STATIONS: {
  id: Station;
  title: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
}[] = [
  { id: "bed", title: "Bed", x: -4.7, z: -3.6, hx: 1.25, hz: 1.9 },
  { id: "sofa", title: "Living Sofa", x: -5.1, z: -0.2, hx: 1.3, hz: 0.6 },
  { id: "kitchen", title: "Kitchen", x: 1.25, z: -5.0, hx: 2.1, hz: 0.65 },
  { id: "fridge", title: "Fridge", x: 4.15, z: -5.0, hx: 0.6, hz: 0.65 },
  { id: "dining", title: "Dining table", x: 2.8, z: -0.5, hx: 1.05, hz: 0.75 },
  { id: "desk", title: "Workspace", x: 3.35, z: 3.2, hx: 0.6, hz: 1.1 },
  { id: "wardrobe", title: "3D Wardrobe Closet", x: -1.7, z: -5.3, hx: 1.05, hz: 0.45 },
  { id: "bathroom", title: "Bathroom", x: -6.05, z: 4.95, hx: 0.5, hz: 0.55 },
  { id: "terrace", title: "Terrace Lounge", x: 9.4, z: -3.7, hx: 0.75, hz: 0.75 },
  { id: "garage", title: "Garage & Upgrades", x: 10.2, z: 3.6, hx: 1.0, hz: 0.75 },
  { id: "door", title: "Front door", x: 0, z: 5.5, hx: 0, hz: 0 },
];

export const COZY_SOLIDS: Rect[] = [
  { x: -6.35, z: -4.8, hx: 0.45, hz: 0.45 }, // nightstand
  { x: -5.1, z: 1.05, hx: 0.85, hz: 0.35 }, // coffee table
  { x: -5.2, z: 2.05, hx: 1.05, hz: 0.22 }, // TV media console
  { x: -6.15, z: 3.15, hx: 0.55, hz: 0.45 }, // bathroom vanity sink
  { x: 9.4, z: -2.3, hx: 0.45, hz: 0.45 }, // terrace coffee table
];

export const APARTMENT_SEATS: Record<string, SeatSnap> = {
  bed: {
    id: "bed",
    title: "Bed",
    seatX: -4.7,
    seatZ: -3.55,
    heading: 0,
    sitY: 0.58,
    exitX: -2.85,
    exitZ: -3.5,
    kind: "sleep",
  },
  sofa: {
    id: "sofa",
    title: "Living Sofa",
    seatX: -5.1,
    seatZ: -0.1,
    heading: 0,
    sitY: 0.02,
    exitX: -3.35,
    exitZ: 0.6,
    kind: "sit",
  },
  dining: {
    id: "dining",
    title: "Dining Chair",
    seatX: 1.42,
    seatZ: -0.5,
    heading: Math.PI / 2,
    sitY: 0.02,
    exitX: 1.15,
    exitZ: 0.65,
    kind: "sit",
  },
  desk: {
    id: "desk",
    title: "Workspace Chair",
    seatX: 2.2,
    seatZ: 3.2,
    heading: Math.PI / 2,
    sitY: 0.02,
    exitX: 1.45,
    exitZ: 3.2,
    kind: "sit",
  },
  terrace: {
    id: "terrace",
    title: "Terrace Lounge Chair",
    seatX: 9.4,
    seatZ: -3.7,
    heading: Math.PI * 0.62,
    sitY: 0.04,
    exitX: 8.2,
    exitZ: -3.1,
    kind: "sit",
  },
  toilet: {
    id: "toilet",
    title: "Toilet",
    seatX: -5.8,
    seatZ: 4.95,
    heading: Math.PI / 2,
    sitY: 0.02,
    exitX: -4.9,
    exitZ: 4.3,
    kind: "sit",
  },
};

export function insideHomeBathroom(x: number, z: number): boolean {
  return x < -3.92 && x > -7.0 && z > 2.52 && z < 6.0;
}

export function insideTerrace(x: number, z: number, houseTier = 0): boolean {
  const t = TERRACE_BOUNDS(houseTier);
  return x >= t.minX && x <= t.maxX && z >= t.minZ && z <= t.maxZ;
}

export function insideGarage(x: number, z: number): boolean {
  return (
    x >= GARAGE_BOUNDS.minX &&
    x <= GARAGE_BOUNDS.maxX &&
    z >= GARAGE_BOUNDS.minZ &&
    z <= GARAGE_BOUNDS.maxZ
  );
}

export function homeBathDoorShouldOpen(x: number, z: number, locked: boolean): boolean {
  if (locked) return false;
  const dist = Math.hypot(x - BATH_DOOR.x, z - BATH_DOOR.z);
  if (insideHomeBathroom(x, z)) return dist < 1.35;
  return dist < 1.85;
}

export function nearStation(x: number, z: number): Station | null {
  const inBath = insideHomeBathroom(x, z);
  let best: Station | null = null;
  let distance = 2.4;
  for (const f of STATIONS) {
    if (f.id === "bathroom" && !inBath) continue;
    if (inBath && f.id !== "bathroom") continue;
    const d = Math.hypot(
      Math.max(0, Math.abs(x - f.x) - f.hx),
      Math.max(0, Math.abs(z - f.z) - f.hz),
    );
    if (d < distance) {
      distance = d;
      best = f.id;
    }
  }
  return best;
}

export function inRect(x: number, z: number, box: Rect, radius = 0.4) {
  return Math.abs(x - box.x) < box.hx + radius && Math.abs(z - box.z) < box.hz + radius;
}

export function apartmentBlocked(
  x: number,
  z: number,
  radius = 0.4,
  extras: Rect[] = [],
  doorLocked = false,
  houseTier = 0,
): boolean {
  const terrace = TERRACE_BOUNDS(houseTier);
  const inMain = Math.abs(x) <= ROOM.hx - radius && Math.abs(z) <= ROOM.hz - radius;
  const inTerraceZone =
    x >= terrace.minX - radius &&
    x <= terrace.maxX - radius &&
    z >= terrace.minZ + radius &&
    z <= terrace.maxZ - radius;
  const inGarageZone =
    x >= GARAGE_BOUNDS.minX - radius &&
    x <= GARAGE_BOUNDS.maxX - radius &&
    z >= GARAGE_BOUNDS.minZ + radius &&
    z <= GARAGE_BOUNDS.maxZ - radius;

  // Keep player inside the union of main apartment + terrace + garage bay
  if (!inMain && !inTerraceZone && !inGarageZone) return true;

  // Solid separator between Terrace (north-east) and Garage (south-east)
  if (x > ROOM.hx - radius && Math.abs(z - 1.3) < 0.14 + radius) return true;

  const solids: Rect[] = [
    ...STATIONS.filter((s) => s.id !== "door"),
    ...BATH_WALLS,
    ...EAST_DIVIDER_WALLS,
    ...COZY_SOLIDS,
    ...(doorLocked ? [{ x: BATH_DOOR.x, z: BATH_DOOR.z, hx: 0.12, hz: 0.65 }] : []),
    ...extras,
  ];
  return solids.some((box) => inRect(x, z, box, radius));
}

export function moveSwept(
  p: { x: number; z: number },
  dx: number,
  dz: number,
  blocked: (x: number, z: number) => boolean,
) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.18));
  const sx = dx / steps;
  const sz = dz / steps;
  let hit = false;
  for (let i = 0; i < steps; i++) {
    if (!blocked(p.x + sx, p.z)) p.x += sx;
    else hit = true;
    if (!blocked(p.x, p.z + sz)) p.z += sz;
    else hit = true;
  }
  return hit;
}
