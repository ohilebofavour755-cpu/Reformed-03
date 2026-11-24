import type { Rect, SeatSnap } from "./apartment";
import { inRect } from "./apartment";

export type BuildingKind =
  | "home"
  | "market"
  | "boutique"
  | "ink"
  | "club"
  | "realtor"
  | "school"
  | "church"
  | "dealer"
  | "police";

export interface InteriorStation {
  id: string;
  title: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
}

export interface InteriorSpec {
  kind: BuildingKind;
  title: string;
  hx: number;
  hz: number;
  spawn: { x: number; z: number; heading: number };
  door: { x: number; z: number };
  solids: Rect[];
  stations: InteriorStation[];
  seats?: Record<string, SeatSnap>;
}

export const INTERIORS: Record<Exclude<BuildingKind, "home">, InteriorSpec> = {
  market: {
    kind: "market",
    title: "🧺 Balogun Supermarket",
    hx: 8,
    hz: 7,
    spawn: { x: 0, z: 4.8, heading: Math.PI },
    door: { x: 0, z: 6.4 },
    solids: [
      { x: -4.8, z: -2.0, hx: 1.5, hz: 2.8 }, // Produce & Ingredients aisle
      { x: -1.2, z: -4.8, hx: 2.2, hz: 0.9 }, // Suya & Puff-puff hot grill counter
      { x: 4.8, z: -2.0, hx: 1.5, hz: 2.8 }, // Drinks & Household aisle
      { x: 4.0, z: 3.4, hx: 1.9, hz: 0.7 }, // Checkout counter
    ],
    stations: [
      { id: "produce", title: "Produce & Ingredients Aisle", x: -4.8, z: -2.0, hx: 1.7, hz: 3.0 },
      { id: "grill", title: "Hot Puff-Puff & Suya Counter", x: -1.2, z: -4.8, hx: 2.3, hz: 1.1 },
      { id: "drinks", title: "Chilled Drinks & Home Aisle", x: 4.8, z: -2.0, hx: 1.7, hz: 3.0 },
      { id: "checkout", title: "Supermarket Checkout", x: 4.0, z: 3.4, hx: 2.0, hz: 0.9 },
      { id: "door", title: "Exit Market", x: 0, z: 6.4, hx: 0.8, hz: 0.4 },
    ],
  },
  boutique: {
    kind: "boutique",
    title: "👗 Ada's Boutique & Salon",
    hx: 8,
    hz: 6.5,
    spawn: { x: 0, z: 4.5, heading: Math.PI },
    door: { x: 0, z: 5.9 },
    solids: [
      { x: 0, z: -4.3, hx: 1.8, hz: 0.4 }, // Full-length mirror backdrop
      { x: -5.2, z: -1.8, hx: 1.1, hz: 1.3 }, // Clothing rack 1
      { x: -5.2, z: 1.7, hx: 1.1, hz: 1.3 }, // Clothing rack 2
      { x: 5.1, z: -2.4, hx: 1.1, hz: 1.1 }, // Hair styling station
      { x: 5.1, z: 1.8, hx: 1.1, hz: 1.0 }, // Nail manicure station
    ],
    stations: [
      { id: "clothes", title: "Clothing Racks & Mirror", x: -5.2, z: 0, hx: 1.5, hz: 3.2 },
      { id: "mirror", title: "Full-Length Mirror", x: 0, z: -2.2, hx: 1.8, hz: 1.5 },
      { id: "hair", title: "Hair Styling Station", x: 5.1, z: -2.4, hx: 1.3, hz: 1.3 },
      { id: "nails", title: "Nail Manicure Station", x: 5.1, z: 1.8, hx: 1.3, hz: 1.2 },
      { id: "door", title: "Exit Boutique", x: 0, z: 5.9, hx: 0.8, hz: 0.4 },
    ],
  },
  ink: {
    kind: "ink",
    title: "🖋️ Ink Studio",
    hx: 7,
    hz: 6,
    spawn: { x: 0, z: 4.1, heading: Math.PI },
    door: { x: 0, z: 5.4 },
    solids: [
      { x: 0, z: -4.2, hx: 2.2, hz: 0.4 }, // Tattoo flash art wall
      { x: -4.4, z: -1.8, hx: 1.0, hz: 1.4 }, // Ink artist supply desk
      { x: 4.6, z: 1.2, hx: 0.7, hz: 1.3 }, // Waiting lounge bench
    ],
    stations: [
      { id: "tattoo", title: "Tattoo Chair & Flash Wall", x: 0, z: -2.4, hx: 2.2, hz: 1.6 },
      { id: "bench", title: "Lounge Bench", x: 4.6, z: 1.2, hx: 0.9, hz: 1.5 },
      { id: "door", title: "Exit Ink Studio", x: 0, z: 5.4, hx: 0.8, hz: 0.4 },
    ],
    seats: {
      bench: {
        id: "ink-bench",
        title: "Lounge Bench",
        seatX: 4.5,
        seatZ: 1.2,
        heading: -Math.PI / 2,
        sitY: 0.02,
        exitX: 3.3,
        exitZ: 1.2,
        kind: "sit",
      },
    },
  },
  club: {
    kind: "club",
    title: "🎶 Club Amapiano",
    hx: 11,
    hz: 10.5,
    spawn: { x: -8.3, z: 0, heading: Math.PI / 2 },
    door: { x: -10.2, z: 0 },
    solids: [
      { x: 0, z: -8.5, hx: 4.0, hz: 0.6 }, // Physical Bar Counter
      { x: 9.2, z: 0, hx: 1.4, hz: 5.2 }, // DJ Stage & Speakers
    ],
    stations: [
      { id: "bar", title: "Amapiano Bar Counter", x: 0, z: -7.5, hx: 4.4, hz: 1.6 },
      { id: "floor", title: "Amapiano Dance Floor", x: 0, z: 1.0, hx: 7.2, hz: 6.2 },
      { id: "door", title: "Exit Club Amapiano", x: -10.2, z: 0, hx: 0.5, hz: 1.2 },
    ],
    seats: {
      bar0: {
        id: "club-bar-0",
        title: "Barstool",
        seatX: -2.4,
        seatZ: -7.2,
        heading: Math.PI,
        sitY: 0.14,
        exitX: -2.4,
        exitZ: -5.9,
        kind: "sit",
      },
      bar1: {
        id: "club-bar-1",
        title: "Barstool",
        seatX: -0.8,
        seatZ: -7.2,
        heading: Math.PI,
        sitY: 0.14,
        exitX: -0.8,
        exitZ: -5.9,
        kind: "sit",
      },
      bar2: {
        id: "club-bar-2",
        title: "Barstool",
        seatX: 0.8,
        seatZ: -7.2,
        heading: Math.PI,
        sitY: 0.14,
        exitX: 0.8,
        exitZ: -5.9,
        kind: "sit",
      },
      bar3: {
        id: "club-bar-3",
        title: "Barstool",
        seatX: 2.4,
        seatZ: -7.2,
        heading: Math.PI,
        sitY: 0.14,
        exitX: 2.4,
        exitZ: -5.9,
        kind: "sit",
      },
    },
  },
  realtor: {
    kind: "realtor",
    title: "🏢 Prime Realtors",
    hx: 7,
    hz: 6,
    spawn: { x: 0, z: 4.1, heading: Math.PI },
    door: { x: 0, z: 5.4 },
    solids: [
      { x: 0, z: -2.8, hx: 2.4, hz: 0.8 }, // Property scale model & desk
      { x: -4.8, z: 0.5, hx: 0.7, hz: 1.5 }, // Waiting sofa
    ],
    stations: [
      { id: "desk", title: "Property Sales Desk", x: 0, z: -2.8, hx: 2.6, hz: 1.0 },
      { id: "sofa", title: "Client Sofa", x: -4.8, z: 0.5, hx: 0.9, hz: 1.7 },
      { id: "door", title: "Exit Prime Realtors", x: 0, z: 5.4, hx: 0.8, hz: 0.4 },
    ],
    seats: {
      sofa: {
        id: "realtor-sofa",
        title: "Client Sofa",
        seatX: -4.7,
        seatZ: 0.5,
        heading: Math.PI / 2,
        sitY: 0.02,
        exitX: -3.5,
        exitZ: 0.5,
        kind: "sit",
      },
    },
  },
  school: {
    kind: "school",
    title: "🎓 City High School",
    hx: 7.5,
    hz: 6,
    spawn: { x: 0, z: 4.1, heading: Math.PI },
    door: { x: 0, z: 5.4 },
    solids: [
      { x: 0, z: -3.8, hx: 1.6, hz: 0.7 }, // Lecturer podium
      { x: -3.2, z: 0, hx: 1.1, hz: 0.7 }, // Student desk L
      { x: 3.2, z: 0, hx: 1.1, hz: 0.7 }, // Student desk R
    ],
    stations: [
      { id: "podium", title: "Lecture Hall Podium", x: 0, z: -3.8, hx: 1.8, hz: 0.9 },
      { id: "deskL", title: "Student Desk", x: -3.2, z: 0.9, hx: 0.9, hz: 0.8 },
      { id: "deskR", title: "Student Desk", x: 3.2, z: 0.9, hx: 0.9, hz: 0.8 },
      { id: "door", title: "Exit School", x: 0, z: 5.4, hx: 0.8, hz: 0.4 },
    ],
    seats: {
      deskL: {
        id: "school-desk-l",
        title: "Student Desk",
        seatX: -3.2,
        seatZ: 1.0,
        heading: Math.PI,
        sitY: 0.02,
        exitX: -3.2,
        exitZ: 2.2,
        kind: "sit",
      },
      deskR: {
        id: "school-desk-r",
        title: "Student Desk",
        seatX: 3.2,
        seatZ: 1.0,
        heading: Math.PI,
        sitY: 0.02,
        exitX: 3.2,
        exitZ: 2.2,
        kind: "sit",
      },
    },
  },
  church: {
    kind: "church",
    title: "⛪ Grace Cathedral",
    hx: 7,
    hz: 6.5,
    spawn: { x: 0, z: 4.5, heading: Math.PI },
    door: { x: 0, z: 5.9 },
    solids: [
      { x: 0, z: -4.3, hx: 2.2, hz: 0.8 }, // Altar
      { x: -3.4, z: -0.5, hx: 1.6, hz: 0.6 }, // Left pew 1
      { x: 3.4, z: -0.5, hx: 1.6, hz: 0.6 }, // Right pew 1
      { x: -3.4, z: 2.0, hx: 1.6, hz: 0.6 }, // Left pew 2
      { x: 3.4, z: 2.0, hx: 1.6, hz: 0.6 }, // Right pew 2
    ],
    stations: [
      { id: "altar", title: "Cathedral Altar", x: 0, z: -4.3, hx: 2.4, hz: 1.0 },
      { id: "pewL", title: "Cathedral Pew", x: -3.4, z: -0.5, hx: 1.7, hz: 0.8 },
      { id: "pewR", title: "Cathedral Pew", x: 3.4, z: -0.5, hx: 1.7, hz: 0.8 },
      { id: "door", title: "Exit Cathedral", x: 0, z: 5.9, hx: 0.8, hz: 0.4 },
    ],
    seats: {
      pewL: {
        id: "church-pew-l",
        title: "Cathedral Pew",
        seatX: -3.4,
        seatZ: -0.4,
        heading: Math.PI,
        sitY: 0.02,
        exitX: -1.4,
        exitZ: -0.4,
        kind: "sit",
      },
      pewR: {
        id: "church-pew-r",
        title: "Cathedral Pew",
        seatX: 3.4,
        seatZ: -0.4,
        heading: Math.PI,
        sitY: 0.02,
        exitX: 1.4,
        exitZ: -0.4,
        kind: "sit",
      },
    },
  },
  dealer: {
    kind: "dealer",
    title: "🚘 City Motors Showroom",
    hx: 8,
    hz: 6.5,
    spawn: { x: 0, z: 4.5, heading: Math.PI },
    door: { x: 0, z: 5.9 },
    solids: [
      { x: -3.6, z: -1.2, hx: 1.5, hz: 1.5 }, // Bicycle pedestal
      { x: 3.6, z: -1.2, hx: 2.2, hz: 1.5 }, // Car pedestal
      { x: 0, z: -4.6, hx: 2.2, hz: 0.7 }, // Sales desk
    ],
    stations: [
      { id: "sales", title: "City Motors Sales Desk", x: 0, z: -4.6, hx: 2.4, hz: 1.0 },
      { id: "bike", title: "Urban Bicycle Display", x: -3.6, z: -1.2, hx: 1.7, hz: 1.7 },
      { id: "car", title: "Classic Sedan Display", x: 3.6, z: -1.2, hx: 2.4, hz: 1.7 },
      { id: "door", title: "Exit Showroom", x: 0, z: 5.9, hx: 0.8, hz: 0.4 },
    ],
  },
  police: {
    kind: "police",
    title: "🚓 Police Station Lobby",
    hx: 6.5,
    hz: 5.5,
    spawn: { x: 0, z: 3.8, heading: Math.PI },
    door: { x: 0, z: 4.9 },
    solids: [
      { x: -0.8, z: -3.2, hx: 1.75, hz: 0.7 }, // Front desk
      { x: -4.5, z: 0.8, hx: 0.6, hz: 1.4 }, // Lobby bench
      { x: 4.55, z: -0.2, hx: 1.95, hz: 0.12 }, // Jail Cell south wall
      { x: 2.6, z: -4.05, hx: 0.12, hz: 1.4 }, // Jail Cell west bars (north of cell door)
      { x: 2.6, z: -0.75, hx: 0.12, hz: 0.55 }, // Jail Cell west bars (south of cell door)
      { x: 5.3, z: -3.6, hx: 0.55, hz: 1.1 }, // Jail bunk bench
      { x: 5.6, z: -1.1, hx: 0.45, hz: 0.45 }, // Jail cell toilet
    ],
    stations: [
      { id: "desk", title: "Police Front Desk", x: -0.8, z: -3.2, hx: 1.9, hz: 0.9 },
      { id: "bench", title: "Waiting Bench", x: -4.5, z: 0.8, hx: 0.8, hz: 1.5 },
      { id: "cell", title: "Police Jail Cell", x: 4.4, z: -2.4, hx: 1.6, hz: 1.8 },
      { id: "door", title: "Exit Police Station", x: 0, z: 4.9, hx: 0.8, hz: 0.4 },
    ],
    seats: {
      bench: {
        id: "police-bench",
        title: "Waiting Bench",
        seatX: -4.4,
        seatZ: 0.8,
        heading: Math.PI / 2,
        sitY: 0.02,
        exitX: -3.2,
        exitZ: 0.8,
        kind: "sit",
      },
      cellBench: {
        id: "police-cell-bunk",
        title: "Cell Bunk",
        seatX: 5.05,
        seatZ: -3.6,
        heading: -Math.PI / 2,
        sitY: 0.02,
        exitX: 4.0,
        exitZ: -3.6,
        kind: "sit",
      },
    },
  },
};

export const POLICE_CELL = {
  minX: 2.75,
  maxX: 6.1,
  minZ: -5.1,
  maxZ: -0.4,
  spawn: { x: 4.1, z: -2.2, heading: -Math.PI / 2 },
  door: { x: 2.6, z: -1.9, hx: 0.14, hz: 0.7 },
};

export function insidePoliceCell(x: number, z: number): boolean {
  return (
    x >= POLICE_CELL.minX && x <= POLICE_CELL.maxX && z >= POLICE_CELL.minZ && z <= POLICE_CELL.maxZ
  );
}

export function interiorBlocked(
  kind: Exclude<BuildingKind, "home">,
  x: number,
  z: number,
  radius = 0.4,
  jailLocked = false,
): boolean {
  const spec = INTERIORS[kind];
  if (Math.abs(x) > spec.hx - radius || Math.abs(z) > spec.hz - radius) return true;
  if (kind === "police" && jailLocked && inRect(x, z, POLICE_CELL.door, radius)) return true;
  return spec.solids.some((box) => inRect(x, z, box, radius));
}

export function nearInteriorStation(
  kind: Exclude<BuildingKind, "home">,
  x: number,
  z: number,
): string | null {
  const spec = INTERIORS[kind];
  let best: string | null = null;
  let dist = 2.3;
  for (const st of spec.stations) {
    const d = Math.hypot(
      Math.max(0, Math.abs(x - st.x) - st.hx),
      Math.max(0, Math.abs(z - st.z) - st.hz),
    );
    if (d < dist) {
      dist = d;
      best = st.id;
    }
  }
  return best;
}

export function nearestInteriorSeat(
  kind: Exclude<BuildingKind, "home">,
  x: number,
  z: number,
): SeatSnap | null {
  const seats = INTERIORS[kind].seats;
  if (!seats) return null;
  let best: SeatSnap | null = null;
  let dist = 2.2;
  for (const seat of Object.values(seats)) {
    const d = Math.hypot(x - seat.seatX, z - seat.seatZ);
    if (d < dist) {
      dist = d;
      best = seat;
    }
  }
  return best;
}

export function clubInteriorIsBar(x: number, z: number): boolean {
  return Math.abs(x) < 4.6 && z > -9.2 && z < -5.8;
}

export function clubInteriorIsFloor(x: number, z: number): boolean {
  return Math.abs(x) < 8.5 && z >= -5.8 && z < 8.5;
}
