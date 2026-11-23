import type { Look } from "./store";
export const OUTFITS: { id: string; name: string; shirt: string; pants: string; price: number }[] = [
  { id: "street", name: "Street casual", shirt: "#e8e9e3", pants: "#253341", price: 0 },
  { id: "sport", name: "Sport club", shirt: "#277b65", pants: "#181c23", price: 6000 },
  { id: "night", name: "After hours", shirt: "#962f4a", pants: "#24212a", price: 6000 },
  { id: "denim", name: "Denim days", shirt: "#4e7799", pants: "#bfc2bc", price: 6000 },
  { id: "sun", name: "Sunny side", shirt: "#e4b548", pants: "#f1eee5", price: 6000 },
];
export const SKIN_TONES = ["#3f2618", "#5a3825", "#8d5a3b", "#c68d62", "#e2b594", "#f3d4bd"];
export const HAIR_COLORS = ["#151010", "#4a2a16", "#a8742c", "#c6b493"];
export const ROOM_THEMES = [
  { id: "gallery", name: "Gallery", wall: "#d9e1e0", accent: "#367c6a", sofa: "#286453", floor: "#a49078" },
  { id: "city", name: "City monochrome", wall: "#d6d5d2", accent: "#37454b", sofa: "#3c4448", floor: "#8c8b84" },
  { id: "rose", name: "Rose studio", wall: "#eddbd8", accent: "#a34c62", sofa: "#8e4258", floor: "#b9a48d" },
];
export type DecorKind = "plant" | "lamp" | "art";
export interface DecorItem { id: string; kind: DecorKind; x: number; z: number; rotation: number }
export const DECOR_CATALOG = [
  { kind: "plant" as const, name: "Indoor plant", price: 1500 },
  { kind: "lamp" as const, name: "Floor lamp", price: 2000 },
  { kind: "art" as const, name: "Sculpture", price: 2500 },
];
export const initialLook = (gender: "male" | "female"): Look => ({ skin: gender === "male" ? "#8d5a3b" : "#c68d62", hair: "#151010", hairStyle: gender === "male" ? 0 : 2, shirt: "#e8e9e3", pants: "#253341" });