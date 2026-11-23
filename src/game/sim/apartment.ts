export type Station = "bed" | "sofa" | "kitchen" | "fridge" | "dining" | "desk" | "wardrobe" | "bathroom" | "door";
export interface Rect { x: number; z: number; hx: number; hz: number }
export const ROOM = { hx: 7, hz: 6 };
export const STATIONS: { id: Station; title: string; x: number; z: number; hx: number; hz: number }[] = [
  { id: "bed", title: "Bed", x: -4.7, z: -3.6, hx: 1.25, hz: 1.9 },
  { id: "sofa", title: "Sofa", x: -4.8, z: 1.2, hx: 0.9, hz: 1.6 },
  { id: "kitchen", title: "Kitchen", x: 1, z: -5, hx: 1.6, hz: 0.65 },
  { id: "fridge", title: "Fridge", x: 3.6, z: -5, hx: 0.6, hz: 0.65 },
  { id: "dining", title: "Dining table", x: 2.5, z: -0.2, hx: 1.05, hz: 0.8 },
  { id: "desk", title: "Workspace", x: 5.7, z: 3, hx: 0.65, hz: 1.25 },
  { id: "wardrobe", title: "Wardrobe", x: -1.7, z: -5.3, hx: 0.85, hz: 0.4 },
  { id: "bathroom", title: "Bathroom", x: -6, z: 4.5, hx: 0.55, hz: 0.6 },
  { id: "door", title: "Front door", x: 0, z: 5.5, hx: 0, hz: 0 },
];
export function nearStation(x: number, z: number): Station | null {
  let best: Station | null = null, distance = 2.4;
  for (const f of STATIONS) {
    const d = Math.hypot(Math.max(0, Math.abs(x - f.x) - f.hx), Math.max(0, Math.abs(z - f.z) - f.hz));
    if (d < distance) { distance = d; best = f.id; }
  }
  return best;
}
export function inRect(x: number, z: number, box: Rect, radius = 0.4) {
  return Math.abs(x - box.x) < box.hx + radius && Math.abs(z - box.z) < box.hz + radius;
}
export function apartmentBlocked(x: number, z: number, radius = 0.4, extras: Rect[] = []): boolean {
  if (Math.abs(x) > ROOM.hx - radius || Math.abs(z) > ROOM.hz - radius) return true;
  return [...STATIONS.filter((s) => s.id !== "door"), ...extras].some((box) => inRect(x, z, box, radius));
}
export function moveSwept(p: { x: number; z: number }, dx: number, dz: number, blocked: (x: number, z: number) => boolean) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.18));
  const sx = dx / steps, sz = dz / steps;
  let hit = false;
  for (let i = 0; i < steps; i++) {
    if (!blocked(p.x + sx, p.z)) p.x += sx; else hit = true;
    if (!blocked(p.x, p.z + sz)) p.z += sz; else hit = true;
  }
  return hit;
}