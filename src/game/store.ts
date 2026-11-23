import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { START_MONEY, rankIndex, RANKS } from "./rules";
import type { Landmark } from "./world";
import type { Station } from "./sim/apartment";
import type { OwnedVehicle } from "./sim/mobility";
import type { DecorItem } from "./catalog";
import type { Npc } from "./npcs";
import { rt } from "./runtime";

export type Gender = "male" | "female";
export interface Look { skin: string; hair: string; hairStyle: number; shirt: string; pants: string }
export interface Profile { name: string; gender: Gender; look: Look }
export interface NearNpc { id: number; name: string; gender: Gender; isPartner: boolean }

export interface GameState {
  profile: Profile | null;
  money: number; xp: number;
  hunger: number; energy: number; bladder: number; fun: number;
  time: number; ingredients: number; meals: number; house: number;
  wanted: number; jailUntil: number;
  partner: { id: number; name: string } | null;
  affection: Record<string, number>;
  muted: boolean;
  inside: boolean;
  position: { x: number; z: number; heading: number; camYaw: number };
  station: Station | null;
  roomTheme: string;
  decor: DecorItem[];
  wardrobe: string[];
  vehicles: OwnedVehicle[];
  groceries: number;
  savedNpcs: Npc[];
  waypoint: Landmark | null;
  lastSaved: number;
  saveError: boolean;
  place: Landmark | null; near: NearNpc | null;
  toast: { id: number; text: string } | null;
  busy: { label: string; start: number; end: number } | null;
  dialog: null | "home" | "boutique" | "decorate" | "dealer" | "divorce" | "map";
  patch: (p: Partial<GameState>) => void;
  notify: (text: string) => void;
  addXp: (n: number) => void;
}

let pending: { name: string; value: string } | null = null;
const queuedStorage: StateStorage = {
  getItem: (name) => { try { return typeof window === "undefined" ? null : window.localStorage.getItem(name); } catch { return null; } },
  setItem: (name, value) => { pending = { name, value }; },
  removeItem: (name) => { if (typeof window !== "undefined") window.localStorage.removeItem(name); },
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      profile: null, money: START_MONEY, xp: 0,
      hunger: 80, energy: 90, bladder: 10, fun: 70,
      time: 9, ingredients: 0, meals: 0, house: 0,
      wanted: 0, jailUntil: 0, partner: null, affection: {}, muted: false,
      inside: true, position: { x: 0, z: 2, heading: Math.PI, camYaw: 0 }, station: null,
      roomTheme: "gallery", decor: [], wardrobe: ["street"], vehicles: [], groceries: 0,
      savedNpcs: [], waypoint: null, lastSaved: 0, saveError: false,
      place: null, near: null, toast: null, busy: null, dialog: null,
      patch: (p) => set(p),
      notify: (text) => set({ toast: { id: Date.now() + Math.random(), text } }),
      addXp: (n) => {
        const before = rankIndex(get().xp);
        const xp = Math.max(0, get().xp + n);
        set({ xp });
        const after = rankIndex(xp);
        if (after > before) get().notify(`⭐ Rank up! You are now ${RANKS[after]?.name}. More respect, more money!`);
      },
    }),
    {
      name: "reformed-city-save",
      storage: createJSONStorage(() => queuedStorage),
      partialize: (s) => ({
        profile: s.profile, money: s.money, xp: s.xp, hunger: s.hunger, energy: s.energy,
        bladder: s.bladder, fun: s.fun, time: s.time, ingredients: s.ingredients, meals: s.meals,
        house: s.house, jailUntil: s.jailUntil, partner: s.partner, affection: s.affection, muted: s.muted,
        inside: s.inside, position: s.position, roomTheme: s.roomTheme, decor: s.decor,
        wardrobe: s.wardrobe, vehicles: s.vehicles, groceries: s.groceries, savedNpcs: s.savedNpcs,
        waypoint: s.waypoint, wanted: s.wanted,
      }),
    },
  ),
);

export function saveNow(): boolean {
  if (typeof window === "undefined" || !useGame.getState().profile) return false;
  const p = rt.player;
  useGame.getState().patch({ position: { x: p.x, z: p.z, heading: p.heading, camYaw: rt.camYaw }, savedNpcs: rt.npcs.map((n) => ({ ...n })) });
  try {
    if (pending) window.localStorage.setItem(pending.name, pending.value);
    pending = null;
    useGame.getState().patch({ lastSaved: Date.now(), saveError: false });
    return true;
  } catch {
    useGame.getState().patch({ saveError: true });
    return false;
  }
}
