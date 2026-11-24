import {
  B,
  BEACH_X,
  WATER_X,
  ROAD_SAFETY_POSTS,
  landmarkCenter,
  resolveCollision,
  onAsphaltRoad,
} from "./world";
import type { BuildingKind } from "./sim/interiors";
import type { Gender } from "./store";

export type Role =
  | "walker"
  | "club"
  | "market"
  | "school"
  | "church"
  | "beach"
  | "hookup"
  | "thug"
  | "police"
  | "bicyclist"
  | "trampoline"
  | "roadsafety"
  | "bartender"
  | "staff";
export type Mode =
  | "walk"
  | "wander"
  | "dance"
  | "sit"
  | "idle"
  | "stagger"
  | "swim"
  | "chase"
  | "follow"
  | "hold"
  | "ride"
  | "bounce"
  | "off";
export interface Npc {
  id: number;
  name: string;
  gender: Gender;
  role: Role;
  base: Mode;
  mode: Mode;
  x: number;
  z: number;
  y: number;
  heading: number;
  speed: number;
  tx: number;
  tz: number;
  phase: number;
  timer: number;
  vx: number;
  vz: number;
  pushed: boolean;
  talkUntil: number;
  ax: number;
  az: number;
  ar: number;
  gx: number;
  gz: number;
  ox: number;
  oz: number;
  skin: string;
  hair: string;
  hairStyle: number;
  shirt: string;
  pants: string;
}

export type CarVariant = "sedan" | "suv" | "danfo" | "police";
export interface Car {
  x: number;
  z: number;
  dir: number;
  speed: number;
  color: string;
  variant: CarVariant;
}

const MALE = [
  "Alex",
  "Tunde",
  "Luca",
  "Chidi",
  "Kai",
  "Noah",
  "Mateo",
  "Amir",
  "Leo",
  "Diego",
  "Femi",
  "Jin",
  "Sam",
  "Rafael",
];
const FEMALE = [
  "Ada",
  "Maya",
  "Sofia",
  "Amaka",
  "Zoe",
  "Lina",
  "Aria",
  "Zainab",
  "Yuki",
  "Emma",
  "Chloe",
  "Isabella",
  "Temi",
  "Nneka",
];
export const SKINS = ["#5a3825", "#7a4b2e", "#8d5a3b", "#c68d62", "#e2b594", "#f3d4bd"];
const HAIRS = ["#151010", "#2b1a10", "#4a2a16", "#6b3d1f", "#a8742c"];
const SHIRTS = [
  "#d94f30",
  "#2f7d5b",
  "#f2c14e",
  "#3a6ea5",
  "#f5f0e6",
  "#8e3b63",
  "#1e1e1e",
  "#e07a5f",
  "#5cb8a6",
  "#c44536",
];
const PANTS = ["#2a2f3a", "#3d5a80", "#6b4f3a", "#1c1c1c", "#c9b38a", "#7a2e3b"];

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function makeNpc(
  id: number,
  role: Role,
  base: Mode,
  ax: number,
  az: number,
  ar: number,
  gender?: Gender,
): Npc {
  const g: Gender = gender ?? (Math.random() < 0.5 ? "male" : "female");
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * ar;
  return {
    id,
    role,
    base,
    mode: base,
    gender: g,
    name: g === "male" ? pick(MALE) : pick(FEMALE),
    x: ax + Math.cos(a) * r,
    z: az + Math.sin(a) * r,
    y: 0,
    heading: Math.random() * 6.28,
    speed: 0,
    tx: ax,
    tz: az,
    phase: Math.random() * 6,
    timer: Math.random() * 3,
    vx: 0,
    vz: 0,
    pushed: false,
    talkUntil: 0,
    ax,
    az,
    ar,
    gx: 0,
    gz: 0,
    ox: 6,
    oz: 6,
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: g === "male" ? pick([0, 0, 1, 3]) : pick([1, 2, 2, 3]),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
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
  n.ox = Math.random() < 0.5 ? -6.2 : 6.2;
  n.oz = Math.random() < 0.5 ? -6.2 : 6.2;
  nodePos(n);
  n.x = n.tx;
  n.z = n.tz;
  nextNode(n);
  n.mode = "walk";
}

function respawnCyclist(n: Npc, px: number, pz: number) {
  // Place cyclist strictly on an asphalt lane (x <= 49.8)
  const dir = Math.floor(Math.random() * 4);
  if (dir < 2) {
    const gx = Math.min(1, Math.round((px - 16) / B) + Math.floor(rnd(-2, 3)));
    n.x = gx * B + B / 2 + (dir === 0 ? -3.4 : 3.4);
    n.z = Math.round((pz - 16) / B) * B + B / 2 + rnd(-48, 48);
    n.tx = n.x;
    n.tz = n.z + (dir === 0 ? 32 : -32);
  } else {
    const gz = Math.round((pz - 16) / B) + Math.floor(rnd(-2, 3));
    n.z = gz * B + B / 2 + (dir === 2 ? 3.4 : -3.4);
    n.x = Math.min(48, Math.max(-64, px + rnd(-48, 48)));
    n.tx = dir === 2 ? Math.min(49, n.x + 32) : n.x - 32;
    n.tz = n.z;
  }
  n.heading = Math.atan2(n.tx - n.x, n.tz - n.z);
  n.mode = "ride";
}

export function createNpcs(px: number, pz: number): Npc[] {
  const list: Npc[] = [];
  let id = 0;
  const add = (
    count: number,
    role: Role,
    base: Mode,
    ax: number,
    az: number,
    ar: number,
    gender?: Gender,
  ) => {
    for (let i = 0; i < count; i++) list.push(makeNpc(id++, role, base, ax, az, ar, gender));
  };

  // 56 brisk city pedestrians along sidewalks
  for (let i = 0; i < 56; i++) {
    const n = makeNpc(id++, "walker", "walk", 0, 0, 0);
    n.speed = rnd(1.4, 2.2);
    respawnWalker(n, px, pz);
    list.push(n);
  }

  // 14 active bicyclists riding along asphalt road lanes & beach boardwalk avenue
  for (let i = 0; i < 14; i++) {
    const n = makeNpc(id++, "bicyclist", "ride", 0, 0, 0);
    n.speed = rnd(5.5, 8.2);
    if (i < 4) {
      // Coastal boardwalk avenue riders near Market & Beach (x = 49.5)
      n.x = 49.5;
      n.z = -36 + i * 24;
      n.tx = 49.5;
      n.tz = n.z + (i % 2 === 0 ? 36 : -36);
      n.heading = i % 2 === 0 ? 0 : Math.PI;
    } else {
      respawnCyclist(n, px, pz);
    }
    list.push(n);
  }

  // 8 trampoline bouncers (4 at City High School courtyard, 4 at Beach Chill Spot)
  const school = landmarkCenter("school");
  const chill = landmarkCenter("chill");
  const trampSpots: [number, number][] = [
    [school.x - 11.2, school.z + 7.5],
    [school.x - 7.8, school.z + 9.2],
    [school.x + 8.0, school.z + 9.2],
    [school.x + 11.2, school.z + 7.5],
    [chill.x - 1.5, chill.z - 8.5],
    [chill.x + 2.2, chill.z - 9.2],
    [chill.x - 1.5, chill.z + 8.5],
    [chill.x + 2.2, chill.z + 9.2],
  ];
  trampSpots.forEach(([tx, tz], idx) => {
    const t = makeNpc(id++, "trampoline", "bounce", tx, tz, 0, "female");
    t.x = tx;
    t.z = tz;
    t.tx = tx;
    t.tz = tz;
    t.phase = idx * 1.1;
    t.heading = tx < BEACH_X ? 0 : Math.PI / 2;
    list.push(t);
  });

  // Club Amapiano & nightlife district (C&h.glb babes + Beachmale.glb thugs)
  const club = landmarkCenter("club");
  add(8, "hookup", "wander", club.x - 13.8, club.z - 2, 3.0, "female");
  add(6, "hookup", "wander", chill.x + 4.0, chill.z - 3, 4.0, "female");
  add(8, "thug", "wander", club.x - 13.8, club.z + 5, 3.0, "male");
  add(6, "thug", "wander", chill.x + 4.5, chill.z + 4, 4.0, "male");

  // Balogun Supermarket & commercial sidewalks
  const market = landmarkCenter("market");
  add(12, "market", "wander", market.x, market.z + 11.2, 4.5);
  const boutique = landmarkCenter("boutique");
  add(4, "walker", "wander", boutique.x, boutique.z + 11.2, 3.5);
  const ink = landmarkCenter("ink");
  add(4, "walker", "wander", ink.x, ink.z + 11.2, 3.5);
  add(6, "school", "wander", school.x, school.z + 11.2, 4.0);
  const church = landmarkCenter("church");
  add(6, "church", "wander", church.x, church.z + 11.2, 4.0);

  // Beach Chill Spot (Beach.glb beachgoers lounging, walking sand & swimming)
  for (const idx of [0, 2, 4]) {
    const sitter = makeNpc(id++, "beach", "sit", chill.x + 11.4, chill.z - 10 + idx * 5, 0);
    sitter.x = chill.x + 11.4;
    sitter.z = chill.z - 10 + idx * 5;
    sitter.heading = Math.PI / 2;
    list.push(sitter);
  }
  add(7, "beach", "wander", chill.x + 7.2, chill.z, 4.2);
  add(6, "beach", "swim", WATER_X + 7, chill.z, 6);

  // 4 FRSC Road Safety officers stationed at major intersections
  ROAD_SAFETY_POSTS.forEach((post, idx) => {
    const rs = makeNpc(id++, "roadsafety", "idle", post.x + 0.8, post.z, 0, "male");
    rs.name = `Marshal ${["Ade", "Musa", "Eze", "Sadiq"][idx % 4]}`;
    rs.x = post.x + 0.8;
    rs.z = post.z;
    rs.tx = rs.x;
    rs.tz = rs.z;
    rs.heading = post.rotY;
    rs.shirt = "#84cc16";
    rs.pants = "#1f2937";
    rs.hairStyle = 0;
    list.push(rs);
  });
  const rsExtra = makeNpc(id++, "roadsafety", "idle", 10.6, -10.8, 0, "female");
  rsExtra.name = "Marshal Ngozi";
  rsExtra.x = 10.6;
  rsExtra.z = -10.8;
  rsExtra.heading = Math.PI;
  rsExtra.shirt = "#84cc16";
  rsExtra.pants = "#1f2937";
  list.push(rsExtra);

  // 6 Police Officers (4 visibly patrolling busy streets + 2 rapid-response backup)
  const patrolAnchors: [number, number][] = [
    [-32, 43],
    [0, 12],
    [32, 12],
    [20, 32],
  ];
  for (let i = 0; i < 6; i++) {
    const isPatrol = i < 4;
    const anchor = patrolAnchors[i] ?? [0, 0];
    const p = makeNpc(id++, "police", isPatrol ? "walk" : "off", anchor[0], anchor[1], 0, "male");
    p.name = [
      "Officer Okafor",
      "Officer Bello",
      "Officer Ibrahim",
      "Officer Musa",
      "Officer Eze",
      "Officer Danladi",
    ][i]!;
    p.shirt = "#1d2b4f";
    p.pants = "#111418";
    p.hairStyle = 0;
    if (isPatrol) {
      p.gx = Math.round((anchor[0] - 16) / B);
      p.gz = Math.round((anchor[1] - 16) / B);
      p.ox = i % 2 === 0 ? -6.2 : 6.2;
      p.oz = 6.2;
      nodePos(p);
      p.x = anchor[0];
      p.z = anchor[1];
      p.mode = "walk";
    } else {
      p.mode = "off";
    }
    list.push(p);
  }

  for (const n of list) {
    if (n.role === "beach" && n.base === "swim") n.x = Math.max(n.x, WATER_X + 3);
  }
  return list;
}

export function createInteriorNpcs(kind: BuildingKind): Npc[] {
  const list: Npc[] = [];
  let id = 1000;
  const fixed = (
    name: string,
    role: Role,
    mode: Mode,
    x: number,
    z: number,
    heading: number,
    gender: Gender,
    shirt: string,
    pants: string,
    hairStyle: number,
  ) => {
    const n = makeNpc(id++, role, mode, x, z, 0, gender);
    n.name = name;
    n.x = x;
    n.z = z;
    n.tx = x;
    n.tz = z;
    n.heading = heading;
    n.shirt = shirt;
    n.pants = pants;
    n.hairStyle = hairStyle;
    list.push(n);
    return n;
  };

  switch (kind) {
    case "club": {
      fixed("Emeka", "bartender", "idle", 0, -9.4, 0, "male", "#14161a", "#111318", 0);
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const r = 2.4 + (i % 2) * 2.2;
        const isBabe = i % 2 === 0;
        const n = makeNpc(
          id++,
          isBabe ? "hookup" : "thug",
          "dance",
          Math.cos(angle) * r,
          1.0 + Math.sin(angle) * r,
          1.5,
          isBabe ? "female" : "male",
        );
        n.heading = Math.random() * Math.PI * 2;
        list.push(n);
      }
      break;
    }
    case "boutique": {
      fixed("Ada", "staff", "idle", 3.5, -0.5, -Math.PI / 2, "female", "#8e3b63", "#1e1e1e", 2);
      fixed("Temi", "walker", "idle", -2.8, 1.2, 0.8, "female", "#e4b548", "#253341", 1);
      fixed("Tunde", "walker", "idle", -2.2, 2.0, -2.4, "male", "#3a6ea5", "#1c1c1c", 0);
      break;
    }
    case "market": {
      fixed("Nneka", "staff", "idle", 4.0, 4.4, Math.PI, "female", "#2f7d5b", "#1c1c1c", 2);
      fixed("Amaka", "market", "idle", -2.1, -1.6, -1.2, "female", "#e07a5f", "#2a2f3a", 1);
      fixed("Femi", "market", "idle", -1.4, -2.2, 1.9, "male", "#f2c14e", "#253341", 0);
      break;
    }
    case "ink": {
      fixed(
        "Kelechi Ink",
        "staff",
        "idle",
        -3.0,
        -1.8,
        Math.PI / 2,
        "male",
        "#181a1f",
        "#111318",
        0,
      );
      fixed("Zoe", "walker", "sit", 4.5, 1.2, -Math.PI / 2, "female", "#962f4a", "#1c1c1c", 3);
      break;
    }
    case "realtor": {
      fixed("Chinedu", "staff", "idle", 0, -3.9, 0, "male", "#1f3a5f", "#1c1c1c", 0);
      break;
    }
    case "school": {
      fixed("Prof. Adebayo", "staff", "idle", 0, -4.6, 0, "male", "#3a5a40", "#253341", 0);
      fixed("Zainab", "school", "sit", -3.2, 1.0, Math.PI, "female", "#f2c14e", "#1d2b4f", 2);
      break;
    }
    case "church": {
      fixed("Pastor Grace", "staff", "idle", 0, -5.2, 0, "female", "#f5f0e6", "#2a2f3a", 3);
      break;
    }
    case "dealer": {
      fixed("Seyi Motors", "staff", "idle", 0, -5.4, 0, "male", "#c44536", "#1c1c1c", 0);
      break;
    }
    case "police": {
      fixed("Sgt. Bello", "police", "idle", 0, -4.0, 0, "male", "#1d2b4f", "#111418", 0);
      break;
    }
    default:
      break;
  }
  return list;
}

export function pushNpc(n: Npc, heading: number) {
  if (
    n.role === "bartender" ||
    n.role === "staff" ||
    n.role === "trampoline" ||
    n.role === "roadsafety"
  )
    return;
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
    const a = k++ * 2.1 + Math.random() * 0.5;
    if (n.mode === "off" || Math.hypot(n.x - px, n.z - pz) > 48) {
      n.x = Math.min(WATER_X - 3, px + Math.cos(a) * 28);
      n.z = pz + Math.sin(a) * 28;
    }
    n.mode = "chase";
  }
}
export function holdPolice(npcs: Npc[], px: number, pz: number) {
  let k = 0;
  for (const n of npcs) {
    if (n.role !== "police") continue;
    const offset = k === 0 ? -1.4 : k === 1 ? 1.4 : (k - 1) * 2.2;
    n.x = px + offset;
    n.z = pz + 1.1;
    n.heading = Math.atan2(px - n.x, pz - n.z);
    n.speed = 0;
    n.mode = "hold";
    k++;
  }
}
export function clearPolice(npcs: Npc[]) {
  for (const n of npcs) if (n.role === "police") n.mode = n.base;
}

const turn = (n: Npc, dx: number, dz: number, dt: number) => {
  const target = Math.atan2(dx, dz);
  let d = target - n.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  n.heading += d * Math.min(1, dt * 8);
};
function moveTo(n: Npc, sp: number, dt: number): number {
  const dx = n.tx - n.x;
  const dz = n.tz - n.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.05) {
    const s = Math.min(d, sp * dt);
    n.x += (dx / d) * s;
    n.z += (dz / d) * s;
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
      case "off":
        continue;
      case "hold":
        n.speed = 0;
        break;
      case "bounce":
        n.speed = 0;
        n.phase += dt * 4.5;
        break;
      case "ride": {
        const d = moveTo(n, 6.2, dt);
        if (d < 0.4 || !onAsphaltRoad(n.x, n.z, 0.5)) {
          // Pick perpendicular or continuing asphalt avenue segment
          const gx = Math.min(1, Math.round((n.x - 16) / B));
          const gz = Math.round((n.z - 16) / B);
          const turnEW = Math.random() < 0.4;
          if (turnEW) {
            const dir = n.x > 40 ? -1 : Math.random() < 0.5 ? 1 : -1;
            n.tz = gz * B + B / 2 + (dir > 0 ? 3.4 : -3.4);
            n.tx = Math.min(49, n.x + dir * B);
          } else {
            const dir = Math.random() < 0.5 ? 1 : -1;
            n.tx = Math.min(49.5, gx * B + B / 2 + (dir > 0 ? -3.4 : 3.4));
            n.tz = n.z + dir * B;
          }
        }
        if (Math.hypot(n.x - px, n.z - pz) > 130) respawnCyclist(n, px, pz);
        break;
      }
      case "walk": {
        if (moveTo(n, n.role === "police" ? 1.85 : 1.65, dt) < 0.3) nextNode(n);
        if (Math.hypot(n.x - px, n.z - pz) > 130) respawnWalker(n, px, pz);
        break;
      }
      case "wander": {
        n.timer -= dt;
        const d = moveTo(n, n.role === "hookup" || n.role === "thug" ? 0.85 : 1.15, dt);
        if (d < 0.2 && n.timer <= 0) {
          if (Math.random() < 0.45) {
            n.mode = "idle";
            n.timer = rnd(1.5, 4.5);
          }
          const a = Math.random() * 6.28;
          const r = Math.sqrt(Math.random()) * n.ar;
          n.tx = n.ax + Math.cos(a) * r;
          n.tz = n.az + Math.sin(a) * r;
          n.timer = rnd(0, 2);
        }
        break;
      }
      case "idle": {
        n.speed = 0;
        if (
          n.role === "bartender" ||
          n.role === "staff" ||
          n.role === "roadsafety" ||
          (n.ar === 0 && n.base === "idle")
        )
          break;
        n.timer -= dt;
        if (n.timer <= 0) n.mode = n.base;
        break;
      }
      case "stagger": {
        n.x += n.vx * dt;
        n.z += n.vz * dt;
        const k = Math.exp(-3 * dt);
        n.vx *= k;
        n.vz *= k;
        n.timer -= dt;
        n.speed = 0;
        if (n.x > WATER_X + 0.5) {
          n.mode = "swim";
          n.timer = 8;
          if (n.pushed) ev.push({ type: "crime", npc: n });
          n.pushed = false;
        } else if (n.timer <= 0) {
          n.pushed = false;
          n.mode = n.base;
          n.tx = n.x;
          n.tz = n.z;
        }
        resolveCollision(n);
        break;
      }
      case "swim": {
        n.phase += dt * 3;
        if (n.base !== "swim") {
          n.timer -= dt;
          if (n.timer < 0) {
            n.x -= 1.4 * dt;
            n.heading = -Math.PI / 2;
          }
          if (n.x < WATER_X - 1.5) {
            n.mode = n.base;
            n.tx = n.x;
            n.tz = n.z;
            if (n.role === "walker") respawnWalker(n, px, pz);
          }
        } else n.heading += dt * 0.2;
        break;
      }
      case "chase": {
        n.tx = px;
        n.tz = pz;
        const d = moveTo(n, n.x > WATER_X ? 2.3 : 5.6, dt);
        resolveCollision(n);
        if (d < 1.3) ev.push({ type: "caught" });
        break;
      }
      case "follow": {
        const dx = px - n.x;
        const dz = pz - n.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.4) {
          n.tx = px - (dx / d) * 2;
          n.tz = pz - (dz / d) * 2;
          moveTo(n, Math.min(7.5, d * 1.6), dt);
        } else n.speed = 0;
        if (d > 60) {
          n.x = px - 2;
          n.z = pz - 2;
        }
        resolveCollision(n);
        break;
      }
      default:
        n.speed = 0;
    }
    n.y =
      n.mode === "swim" ||
      (n.mode === "chase" && n.x > WATER_X) ||
      (n.mode === "follow" && n.x > WATER_X)
        ? -0.05
        : 0;
    n.phase += dt * n.speed * 2.4;
  }
  return ev;
}

const CAR_COLORS = ["#c0392b", "#f5f5f0", "#1f3a5f", "#2d2d2d", "#27ae60", "#8e8e8e", "#d35400"];
export function createCars(n: number, px: number, pz: number): Car[] {
  const cars: Car[] = [];
  for (let i = 0; i < n; i++) {
    const variant: CarVariant =
      i % 7 === 0 ? "police" : i % 4 === 0 ? "danfo" : i % 3 === 0 ? "suv" : "sedan";
    const color =
      variant === "police" ? "#1b2944" : variant === "danfo" ? "#f2c14e" : pick(CAR_COLORS);
    const c: Car = {
      x: 0,
      z: 0,
      dir: 0,
      speed: variant === "police" ? rnd(9, 13) : rnd(7, 11.5),
      color,
      variant,
    };
    respawnCar(c, px, pz);
    cars.push(c);
  }
  return cars;
}
function respawnCar(c: Car, px: number, pz: number) {
  c.dir = Math.floor(Math.random() * 4);
  if (c.dir < 2) {
    const gx = Math.min(1, Math.round((px - 16) / B) + Math.floor(rnd(-3, 4)));
    c.x = gx * B + B / 2 + (c.dir === 0 ? -2.4 : 2.4);
    c.z = pz + rnd(-110, 110);
  } else {
    const gz = Math.round((pz - 16) / B) + Math.floor(rnd(-3, 4));
    c.z = gz * B + B / 2 + (c.dir === 2 ? 2.4 : -2.4);
    c.x = Math.min(48.5, px + rnd(-110, 110));
  }
}
export function carVec(dir: number): [number, number] {
  return dir === 0 ? [0, 1] : dir === 1 ? [0, -1] : dir === 2 ? [1, 0] : [-1, 0];
}
export function stepCars(cars: Car[], dt: number, px = 0, pz = 0) {
  for (const c of cars) {
    const [vx, vz] = carVec(c.dir);
    const ax = px - c.x;
    const az = pz - c.z;
    const ahead = ax * vx + az * vz;
    const side = Math.abs(ax * vz - az * vx);
    if (ahead > 0 && ahead < 7 && side < 2.2) continue;
    c.x += vx * c.speed * dt;
    c.z += vz * c.speed * dt;
    const pastEastEdge = c.dir >= 2 ? c.x > 49.0 : c.x > 50.6;
    if (Math.hypot(ax, az) > 150 || pastEastEdge || !onAsphaltRoad(c.x, c.z, 1.0)) {
      respawnCar(c, px, pz);
    }
  }
}
