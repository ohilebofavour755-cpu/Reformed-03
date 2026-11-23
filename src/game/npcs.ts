import { B, WATER_X, landmarkCenter, resolveCollision } from "./world";
import type { Gender } from "./store";

export type Role = "walker" | "club" | "market" | "school" | "church" | "beach" | "hookup" | "thug" | "police";
export type Mode = "walk" | "wander" | "dance" | "sit" | "idle" | "stagger" | "swim" | "chase" | "follow" | "off";
export interface Npc {
  id: number; name: string; gender: Gender; role: Role; base: Mode; mode: Mode;
  x: number; z: number; y: number; heading: number; speed: number; tx: number; tz: number;
  phase: number; timer: number; vx: number; vz: number; pushed: boolean;
  ax: number; az: number; ar: number; gx: number; gz: number; ox: number; oz: number;
  skin: string; hair: string; hairStyle: number; shirt: string; pants: string;
}
export interface Car { x: number; z: number; dir: number; speed: number; color: string }

const MALE = ["Alex", "Tunde", "Luca", "Chidi", "Kai", "Noah", "Mateo", "Amir", "Leo", "Diego", "Femi", "Jin", "Sam", "Rafael"];
const FEMALE = ["Ada", "Maya", "Sofia", "Amaka", "Zoe", "Lina", "Aria", "Zainab", "Yuki", "Emma", "Chloe", "Isabella", "Temi", "Nneka"];
export const SKINS = ["#5a3825", "#7a4b2e", "#8d5a3b", "#c68d62", "#e2b594", "#f3d4bd"];
const HAIRS = ["#151010", "#2b1a10", "#4a2a16", "#6b3d1f", "#a8742c"];
const SHIRTS = ["#d94f30", "#2f7d5b", "#f2c14e", "#3a6ea5", "#f5f0e6", "#8e3b63", "#1e1e1e", "#e07a5f", "#5cb8a6", "#c44536"];
const PANTS = ["#2a2f3a", "#3d5a80", "#6b4f3a", "#1c1c1c", "#c9b38a", "#7a2e3b"];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function makeNpc(id: number, role: Role, base: Mode, ax: number, az: number, ar: number, gender?: Gender): Npc {
  const g: Gender = gender ?? (Math.random() < 0.5 ? "male" : "female");
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * ar;
  return {
    id, role, base, mode: base, gender: g, name: g === "male" ? pick(MALE) : pick(FEMALE),
    x: ax + Math.cos(a) * r, z: az + Math.sin(a) * r, y: 0, heading: Math.random() * 6.28,
    speed: 0, tx: ax, tz: az, phase: Math.random() * 6, timer: Math.random() * 3, vx: 0, vz: 0, pushed: false,
    ax, az, ar, gx: 0, gz: 0, ox: 6, oz: 6,
    skin: pick(SKINS), hair: pick(HAIRS),
    hairStyle: g === "male" ? pick([0, 0, 1, 4]) : pick([1, 2, 2, 3]),
    shirt: pick(SHIRTS), pants: pick(PANTS),
  };
}

function nodePos(n: Npc) {
  n.tx = n.gx * B + B / 2 + n.ox;
  n.tz = n.gz * B + B / 2 + n.oz;
}
function nextNode(n: Npc) {
  if (Math.random() < 0.5) n.gx += Math.random() < 0.5 ? 1 : -1;
  else n.gz += Math.random() < 0.5 ? 1 : -1;
  if (n.gx > 1) n.gx = 1;
  nodePos(n);
}
function respawnWalker(n: Npc, px: number, pz: number) {
  n.gx = Math.min(1, Math.round((px - 16) / B) + Math.floor(rnd(-3, 4)));
  n.gz = Math.round((pz - 16) / B) + Math.floor(rnd(-3, 4));
  n.ox = Math.random() < 0.5 ? -6 : 6;
  n.oz = Math.random() < 0.5 ? -6 : 6;
  nodePos(n);
  n.x = n.tx; n.z = n.tz;
  if (Math.random() < 0.5) n.x += rnd(-12, 12) * 0; else n.z += 0;
  nextNode(n);
  n.mode = "walk";
}

export function createNpcs(px: number, pz: number): Npc[] {
  const list: Npc[] = [];
  let id = 0;
  const add = (count: number, role: Role, base: Mode, ax: number, az: number, ar: number, gender?: Gender) => {
    for (let i = 0; i < count; i++) list.push(makeNpc(id++, role, base, ax, az, ar, gender));
  };
  for (let i = 0; i < 55; i++) {
    const n = makeNpc(id++, "walker", "walk", 0, 0, 0);
    n.speed = rnd(1.1, 1.8);
    respawnWalker(n, px, pz);
    list.push(n);
  }
  const club = landmarkCenter("club");
  add(28, "club", "dance", club.x + 2, club.z, 7);
  add(6, "hookup", "wander", club.x - 13.5, club.z - 3, 3, "female");
  add(6, "thug", "wander", club.x - 13.5, club.z + 4, 3, "male");
  const market = landmarkCenter("market");
  add(16, "market", "wander", market.x, market.z, 9);
  const school = landmarkCenter("school");
  add(12, "school", "wander", school.x, school.z + 12.5, 4);
  const church = landmarkCenter("church");
  add(10, "church", "wander", church.x, church.z + 12.5, 4);
  const chill = landmarkCenter("chill");
  add(6, "beach", "sit", chill.x + 10, chill.z, 6);
  add(8, "beach", "wander", chill.x + 11, chill.z, 4);
  add(6, "beach", "swim", WATER_X + 7, chill.z, 6);
  for (let i = 0; i < 2; i++) {
    const p = makeNpc(id++, "police", "off", 0, 0, 0, "male");
    p.name = i ? "Officer Bello" : "Officer Okafor";
    p.shirt = "#1d2b4f"; p.pants = "#111418"; p.hairStyle = 0; p.mode = "off";
    list.push(p);
  }
  for (const n of list) if (n.role === "beach" && n.base === "swim") n.x = Math.max(n.x, WATER_X + 3);
  return list;
}

export function pushNpc(n: Npc, heading: number) {
  n.vx = Math.sin(heading) * 13;
  n.vz = Math.cos(heading) * 13;
  n.mode = "stagger";
  n.timer = 1.3;
  n.pushed = true;
}

export function spawnPolice(npcs: Npc[], px: number, pz: number) {
  let k = 0;
  for (const n of npcs) {
    if (n.role !== "police") continue;
    const a = k++ * 2.4 + Math.random();
    n.x = Math.min(WATER_X - 3, px + Math.cos(a) * 28);
    n.z = pz + Math.sin(a) * 28;
    n.mode = "chase";
  }
}
export function clearPolice(npcs: Npc[]) {
  for (const n of npcs) if (n.role === "police") n.mode = "off";
}

const turn = (n: Npc, dx: number, dz: number, dt: number) => {
  const target = Math.atan2(dx, dz);
  let d = target - n.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  n.heading += d * Math.min(1, dt * 8);
};
function moveTo(n: Npc, sp: number, dt: number): number {
  const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
  if (d > 0.05) {
    const s = Math.min(d, sp * dt);
    n.x += (dx / d) * s; n.z += (dz / d) * s;
    turn(n, dx, dz, dt);
  }
  n.speed = d > 0.05 ? sp : 0;
  return d;
}

export type NpcEvent = { type: "crime"; npc: Npc } | { type: "caught" };

export function stepNpcs(npcs: Npc[], dt: number, px: number, pz: number): NpcEvent[] {
  const ev: NpcEvent[] = [];
  for (const n of npcs) {
    switch (n.mode) {
      case "off": continue;
      case "walk": {
        if (moveTo(n, 1.5, dt) < 0.3) nextNode(n);
        if (Math.hypot(n.x - px, n.z - pz) > 130) respawnWalker(n, px, pz);
        break;
      }
      case "wander": {
        n.timer -= dt;
        const d = moveTo(n, n.role === "hookup" || n.role === "thug" ? 0.7 : 1.1, dt);
        if (d < 0.2 && n.timer <= 0) {
          if (Math.random() < 0.5) { n.mode = "idle"; n.timer = rnd(2, 6); }
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * n.ar;
          n.tx = n.ax + Math.cos(a) * r; n.tz = n.az + Math.sin(a) * r;
          n.timer = rnd(0, 2);
        }
        break;
      }
      case "idle": {
        n.speed = 0; n.timer -= dt;
        if (n.timer <= 0) n.mode = n.base;
        break;
      }
      case "stagger": {
        n.x += n.vx * dt; n.z += n.vz * dt;
        const k = Math.exp(-3 * dt);
        n.vx *= k; n.vz *= k; n.timer -= dt; n.speed = 0;
        if (n.x > WATER_X + 0.5) {
          n.mode = "swim"; n.timer = 8;
          if (n.pushed) ev.push({ type: "crime", npc: n });
          n.pushed = false;
        } else if (n.timer <= 0) { n.pushed = false; n.mode = n.base; n.tx = n.x; n.tz = n.z; }
        resolveCollision(n);
        break;
      }
      case "swim": {
        n.phase += dt * 3;
        if (n.base !== "swim") {
          n.timer -= dt;
          if (n.timer < 0) { n.x -= 1.4 * dt; n.heading = -Math.PI / 2; }
          if (n.x < WATER_X - 1.5) { n.mode = n.base; n.tx = n.x; n.tz = n.z; if (n.role === "walker") respawnWalker(n, px, pz); }
        } else n.heading += dt * 0.2;
        break;
      }
      case "chase": {
        n.tx = px; n.tz = pz;
        const d = moveTo(n, n.x > WATER_X ? 2.3 : 5.6, dt);
        resolveCollision(n);
        if (d < 1.3) ev.push({ type: "caught" });
        break;
      }
      case "follow": {
        const dx = px - n.x, dz = pz - n.z, d = Math.hypot(dx, dz);
        if (d > 2.4) { n.tx = px - (dx / d) * 2; n.tz = pz - (dz / d) * 2; moveTo(n, Math.min(7.5, d * 1.6), dt); }
        else n.speed = 0;
        if (d > 60) { n.x = px - 2; n.z = pz - 2; }
        resolveCollision(n);
        break;
      }
      default: n.speed = 0;
    }
    n.y = n.mode === "swim" || (n.mode === "chase" && n.x > WATER_X) || (n.mode === "follow" && n.x > WATER_X) ? -0.05 : 0;
    n.phase += dt * n.speed * 2.4;
  }
  return ev;
}

const CAR_COLORS = ["#c0392b", "#f5f5f0", "#1f3a5f", "#f1c40f", "#2d2d2d", "#27ae60", "#8e8e8e", "#d35400"];
export function createCars(n: number, px: number, pz: number): Car[] {
  const cars: Car[] = [];
  for (let i = 0; i < n; i++) {
    const c: Car = { x: 0, z: 0, dir: 0, speed: rnd(7, 12), color: pick(CAR_COLORS) };
    respawnCar(c, px, pz);
    cars.push(c);
  }
  return cars;
}
function respawnCar(c: Car, px: number, pz: number) {
  c.dir = Math.floor(Math.random() * 4);
  if (c.dir < 2) {
    const gx = Math.min(1, Math.round((px - 16) / B) + Math.floor(rnd(-3, 4)));
    c.x = gx * B + B / 2 + (c.dir === 0 ? -2.5 : 2.5);
    c.z = pz + rnd(-110, 110);
  } else {
    const gz = Math.round((pz - 16) / B) + Math.floor(rnd(-3, 4));
    c.z = gz * B + B / 2 + (c.dir === 2 ? 2.5 : -2.5);
    c.x = Math.min(WATER_X - 14, px + rnd(-110, 110));
  }
}
export function carVec(dir: number): [number, number] {
  return dir === 0 ? [0, 1] : dir === 1 ? [0, -1] : dir === 2 ? [1, 0] : [-1, 0];
}
export function stepCars(cars: Car[], dt: number, px: number, pz: number) {
  for (const c of cars) {
    const [vx, vz] = carVec(c.dir);
    const ax = px - c.x, az = pz - c.z;
    const ahead = ax * vx + az * vz, side = Math.abs(ax * vz - az * vx);
    if (ahead > 0 && ahead < 7 && side < 2.2) continue; // stop for the player
    c.x += vx * c.speed * dt; c.z += vz * c.speed * dt;
    if (Math.hypot(ax, az) > 150 || c.x > WATER_X - 10) respawnCar(c, px, pz);
  }
}
