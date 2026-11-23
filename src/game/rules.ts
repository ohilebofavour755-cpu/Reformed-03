// Pure game rules: no React, no three.js.
export const START_MONEY = 30_000;
export const BASE_EARNINGS = 3_000;
export const EARNINGS_PER_RANK = 2_000;
export const POLICE_FINE = 20_000;
export const JAIL_MS = 5 * 60 * 1000;
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
  puffpuff: 1_500,
  suya: 2_500,
  school: 2_500,
  offering: 500,
  dance: 1_000,
  drink: 1_500,
  outfit: 6_000,
  hair: 3_500,
  toilet: 200,
};

export const HOUSES = [
  { name: "Self-contain room", price: 0 },
  { name: "Mini flat", price: 80_000 },
  { name: "Duplex", price: 250_000 },
  { name: "Banana Island Mansion", price: 900_000 },
];

export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-US");
