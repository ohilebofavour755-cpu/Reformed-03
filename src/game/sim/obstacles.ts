import { apartmentBlocked, inRect, moveSwept } from "./apartment";
import { interiorBlocked, type BuildingKind } from "./interiors";
import { cityBlocked, vehicleRoadBlocked } from "../world";
import { DECOR_CATALOG, type DecorItem } from "../catalog";
import type { OwnedVehicle } from "./mobility";

export interface SolidVehicle {
  x: number;
  z: number;
  heading: number;
  kind: "bike" | "moto" | "car" | "supercar";
  id?: string;
}

export function vehicleBlocked(x: number, z: number, v: SolidVehicle, radius = 0.4) {
  const dx = x - v.x;
  const dz = z - v.z;
  const c = Math.cos(v.heading);
  const s = Math.sin(v.heading);
  const isFourWheel = v.kind === "car" || v.kind === "supercar";
  return inRect(
    dx * c - dz * s,
    dx * s + dz * c,
    { x: 0, z: 0, hx: isFourWheel ? 0.95 : 0.35, hz: isFourWheel ? 2.1 : 1.0 },
    radius,
  );
}

const WALKABLE_DECOR = new Set(DECOR_CATALOG.filter((d) => d.walkable).map((d) => d.kind));

export function movementBlocked(
  x: number,
  z: number,
  inside: boolean | BuildingKind | null,
  decor: Pick<DecorItem, "x" | "z" | "kind">[],
  vehicles: SolidVehicle[],
  radius = 0.4,
  ignore?: string,
  doorLocked = false,
  houseTier = 0,
  onRoadOnly = false,
  jailLocked = false,
) {
  if (inside === true || inside === "home") {
    const solidDecor = decor
      .filter((d) => !WALKABLE_DECOR.has(d.kind))
      .map((d) => ({ x: d.x, z: d.z, hx: 0.35, hz: 0.35 }));
    return apartmentBlocked(x, z, radius, solidDecor, doorLocked, houseTier);
  }
  if (typeof inside === "string") {
    return interiorBlocked(inside, x, z, radius, jailLocked);
  }
  const worldHit = onRoadOnly
    ? vehicleRoadBlocked(x, z, radius, doorLocked)
    : cityBlocked(x, z, radius, doorLocked);
  return worldHit || vehicles.some((v) => v.id !== ignore && vehicleBlocked(x, z, v, radius));
}

export function movePlayer(
  p: { x: number; z: number },
  dx: number,
  dz: number,
  inside: boolean | BuildingKind | null,
  decor: Pick<DecorItem, "x" | "z" | "kind">[],
  vehicles: SolidVehicle[],
  radius = 0.4,
  ignore?: string,
  doorLocked = false,
  houseTier = 0,
  onRoadOnly = false,
  jailLocked = false,
) {
  return moveSwept(p, dx, dz, (x, z) =>
    movementBlocked(
      x,
      z,
      inside,
      decor,
      vehicles,
      radius,
      ignore,
      doorLocked,
      houseTier,
      onRoadOnly,
      jailLocked,
    ),
  );
}

export function trafficSolids(
  cars: { x: number; z: number; dir: number }[],
  owned: OwnedVehicle[],
): SolidVehicle[] {
  return [
    ...owned,
    ...cars.map((c, i) => ({
      x: c.x,
      z: c.z,
      kind: "car" as const,
      heading: [0, Math.PI, Math.PI / 2, -Math.PI / 2][c.dir] ?? 0,
      id: `traffic-${i}`,
    })),
  ];
}
