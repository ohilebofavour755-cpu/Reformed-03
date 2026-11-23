// Per-frame mutable state, outside React.
import type { Npc, Car } from "./npcs";
export const rt = {
  player: { x: 0, z: 2, y: 0, heading: Math.PI, speed: 0, swim: false, phase: 0, act: null as null | "dance" | "sit" },
  input: { x: 0, y: 0 },
  keys: new Set<string>(),
  camYaw: 0,
  npcs: [] as Npc[],
  cars: [] as Car[],
  t: 0,
  calm: 0,
  driving: null as string | null,
  vehicleSpeed: 0,
  smoke: { x: 0, z: 0, until: 0 },
  crashCooldown: 0,
  mats: { lamp: null as null | { emissiveIntensity: number }, windows: null as null | { emissiveIntensity: number } },
};
