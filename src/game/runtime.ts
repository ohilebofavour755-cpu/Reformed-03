// Per-frame mutable state, outside React.
import type { Npc, Car } from "./npcs";
export type PlayerAct = null | "dance" | "sit" | "sleep";

export const rt = {
  player: {
    x: 0,
    z: 2,
    y: 0,
    heading: Math.PI,
    speed: 0,
    swim: false,
    phase: 0,
    act: null as PlayerAct,
    sitY: 0,
    talkUntil: 0,
    exitPos: null as null | { x: number; z: number },
  },
  input: { x: 0, y: 0 },
  keys: new Set<string>(),
  camYaw: 0,
  npcs: [] as Npc[],
  interiorNpcs: [] as Npc[],
  cars: [] as Car[],
  t: 0,
  calm: 0,
  driving: null as string | null,
  vehicleSpeed: 0,
  smoke: { x: 0, z: 0, until: 0 },
  crashCooldown: 0,
  doorLocked: false,
  tryOnYaw: 0,
  mats: {
    lamp: null as null | { emissiveIntensity: number },
    windows: null as null | { emissiveIntensity: number },
  },
};
