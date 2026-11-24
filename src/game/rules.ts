// Pure game rules: no React, no three.js.
export const START_MONEY = 30_000;
export const BASE_EARNINGS = 3_000;
export const EARNINGS_PER_RANK = 2_000;
export const POLICE_FINE = 20_000;
export const JAIL_MS = 5 * 60 * 1000;
export const ARREST_COUNTDOWN_MS = 10_000;
export const PUSH_WANTED_STARS = 2;

export const RANKS = [
  { name: "Newcomer", xp: 0 },
  { name: "Hustler", xp: 120 },
  { name: "Rising Star", xp: 350 },
  { name: "Big Shot", xp: 800 },
  { name: "Odogwu", xp: 1600 },
  { name: "City Legend", xp: 3000 },
];

export function rankIndex(xp: number): number {
  let r = 0;
  RANKS.forEach((k, i) => {
    if (xp >= k.xp) r = i;
  });
  return r;
}
export function rankName(xp: number): string {
  return RANKS[rankIndex(xp)]?.name ?? "Newcomer";
}
export function remoteEarnings(xp: number): number {
  return BASE_EARNINGS + rankIndex(xp) * EARNINGS_PER_RANK;
}
export function respect(xp: number): number {
  return Math.min(100, Math.round(rankIndex(xp) * 18 + (xp % 120) / 12));
}
export function warmChance(xp: number): number {
  return Math.min(0.95, 0.55 + rankIndex(xp) * 0.08);
}
export function flirtChance(xp: number): number {
  return Math.min(0.9, 0.4 + rankIndex(xp) * 0.09);
}

export type Arrest = { kind: "fine"; money: number } | { kind: "jail"; until: number };
export function arrest(money: number, now: number): Arrest {
  return money >= POLICE_FINE
    ? { kind: "fine", money: money - POLICE_FINE }
    : { kind: "jail", until: now + JAIL_MS };
}

export const PRICES = {
  ingredients: 4_000,
  fruit: 1_200,
  puffpuff: 1_500,
  suya: 2_500,
  zobo: 800,
  household: 1_800,
  school: 2_500,
  offering: 500,
  dance: 0,
  drink: 1_500,
  outfit: 6_000,
  hair: 3_500,
  nails: 2_000,
  tattooRemove: 2_000,
  toilet: 200,
};

export const HOUSES = [
  {
    name: "Lagos Starter Room",
    price: 0,
    terraceW: 4.6,
    desc: "Cozy starter room with open 3D wardrobe, private bathroom & balcony terrace",
  },
  {
    name: "Lekki Phase 1 Apartment",
    price: 45_000,
    terraceW: 6.0,
    desc: "Warm matte oak porcelain tiles, lush palm terrace & designer lighting",
  },
  {
    name: "Victoria Island Luxury High-Rise",
    price: 120_000,
    terraceW: 7.4,
    desc: "Matte cream marble tiles, gold chandelier & panoramic VI skyline terrace",
  },
  {
    name: "Banana Island Waterfront Penthouse",
    price: 280_000,
    terraceW: 9.0,
    desc: "Grand limestone penthouse with waterfront plunge pool & terrace loungers",
  },
];

export const RIDE_TIERS = [
  {
    tier: 1,
    kind: "bike" as const,
    name: "City Bicycle",
    price: 12_000,
    speed: 11,
    desc: "Nimble city commuter parked in your garage bay",
  },
  {
    tier: 2,
    kind: "moto" as const,
    name: "Power Bike (Motorcycle)",
    price: 28_000,
    speed: 17,
    desc: "Agile matte sport motorcycle built for wide boulevards",
  },
  {
    tier: 3,
    kind: "car" as const,
    name: "Standard Car",
    price: 65_000,
    speed: 22,
    desc: "Sleek everyday city sedan for fast cruising",
  },
  {
    tier: 4,
    kind: "supercar" as const,
    name: "Luxury Sports Car",
    price: 150_000,
    speed: 30,
    desc: "Low-slung twin-stripe exotic supercar",
  },
];

export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-US");
