export type VehicleKind = "bike" | "moto" | "car" | "supercar";
export interface OwnedVehicle {
  id: string;
  kind: VehicleKind;
  x: number;
  z: number;
  heading: number;
}
export const VEHICLE_CATALOG = [
  { kind: "bike" as const, name: "City Bicycle", price: 12000, speed: 11, radius: 0.6 },
  { kind: "moto" as const, name: "Power Bike (Motorcycle)", price: 28000, speed: 17, radius: 0.7 },
  { kind: "car" as const, name: "Standard Car", price: 65000, speed: 22, radius: 1.25 },
  { kind: "supercar" as const, name: "Luxury Sports Car", price: 150000, speed: 30, radius: 1.25 },
];
export const VEHICLE_FEEL = { acceleration: 7.5, brake: 14, drag: 1.4, turn: 1.7 };
export function driveStep(
  v: { speed: number; heading: number },
  throttle: number,
  steer: number,
  dt: number,
  kind: VehicleKind,
) {
  const limit = kind === "supercar" ? 30 : kind === "car" ? 22 : kind === "moto" ? 17 : 11;
  if (throttle)
    v.speed +=
      throttle * (v.speed * throttle < 0 ? VEHICLE_FEEL.brake : VEHICLE_FEEL.acceleration) * dt;
  else v.speed *= Math.exp(-VEHICLE_FEEL.drag * dt);
  v.speed = Math.max(-limit * 0.35, Math.min(limit, v.speed));
  v.heading -=
    steer * VEHICLE_FEEL.turn * Math.min(1, Math.abs(v.speed) / 3) * Math.sign(v.speed || 1) * dt;
  return { dx: Math.sin(v.heading) * v.speed * dt, dz: Math.cos(v.heading) * v.speed * dt };
}
export const AUTOSAVE_MS = 10_000;
export function divorceState(confirmed: boolean, partner: { id: number; name: string } | null) {
  return confirmed ? null : partner;
}
export function crashResult() {
  return { fatal: false, smoke: true, speedMultiplier: 0.15 } as const;
}
