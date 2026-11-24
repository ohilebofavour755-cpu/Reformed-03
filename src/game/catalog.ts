import type { Look } from "./store";

export const OUTFITS: { id: string; name: string; shirt: string; pants: string; price: number }[] =
  [
    { id: "street", name: "Street casual", shirt: "#e8e9e3", pants: "#253341", price: 0 },
    { id: "sport", name: "Sport club", shirt: "#277b65", pants: "#181c23", price: 6000 },
    { id: "night", name: "After hours", shirt: "#962f4a", pants: "#24212a", price: 6000 },
    { id: "denim", name: "Denim days", shirt: "#4e7799", pants: "#bfc2bc", price: 6000 },
    { id: "sun", name: "Sunny side", shirt: "#e4b548", pants: "#f1eee5", price: 6000 },
  ];

export const NAIL_COLORS: { id: string; name: string; color: string; price: number }[] = [
  { id: "natural", name: "Natural Gloss", color: "", price: 0 },
  { id: "red", name: "Lagos Red", color: "#d90429", price: 2000 },
  { id: "rose", name: "Rose Blush", color: "#ff70a6", price: 2000 },
  { id: "gold", name: "Champagne Gold", color: "#e9c46a", price: 2000 },
  { id: "midnight", name: "Midnight Matte", color: "#1d1e2c", price: 2000 },
  { id: "mint", name: "Emerald Mint", color: "#2ec4b6", price: 2000 },
];

export const TATTOOS: { id: string; name: string; desc: string; ink: string; price: number }[] = [
  {
    id: "none",
    name: "No Tattoo (Clean)",
    desc: "Laser-clean natural skin",
    ink: "#1b2028",
    price: 2000,
  },
  {
    id: "wrist",
    name: "Minimalist Wrist",
    desc: "Clean twin forearm band",
    ink: "#182028",
    price: 4000,
  },
  {
    id: "crown",
    name: "Lagos Crown",
    desc: "Bold gold-dark crown crest",
    ink: "#282218",
    price: 7500,
  },
  {
    id: "tribal",
    name: "Tribal Armband",
    desc: "Classic wrapped bicep ink",
    ink: "#111827",
    price: 6500,
  },
  {
    id: "phoenix",
    name: "Phoenix Forearm",
    desc: "Crimson & charcoal wing",
    ink: "#6a1b29",
    price: 9500,
  },
  {
    id: "sleeve",
    name: "Full Arm Sleeve",
    desc: "Full geometric sleeve ink",
    ink: "#1e3a5f",
    price: 12000,
  },
];

export const MARKET_ITEMS: {
  id: "groceries" | "fruit" | "puffpuff" | "suya" | "zobo" | "household";
  aisle: "produce" | "grill" | "drinks";
  name: string;
  desc: string;
  price: number;
  emoji: string;
}[] = [
  {
    id: "groceries",
    aisle: "produce",
    name: "Jollof Ingredients Pack",
    desc: "Tomatoes, rice & spices for your home fridge",
    price: 4000,
    emoji: "🥬",
  },
  {
    id: "fruit",
    aisle: "produce",
    name: "Fresh Fruit Basket",
    desc: "Sweet mangoes, oranges & pineapple (+25 Hunger)",
    price: 1200,
    emoji: "🥭",
  },
  {
    id: "puffpuff",
    aisle: "grill",
    name: "Hot Puff-Puff Pack",
    desc: "Golden street-style puff-puff (+20 Hunger)",
    price: 1500,
    emoji: "🍩",
  },
  {
    id: "suya",
    aisle: "grill",
    name: "Pepper Beef Suya",
    desc: "Smoky yaji suya wrap (+35 Hunger, +5 Fun)",
    price: 2500,
    emoji: "🍢",
  },
  {
    id: "zobo",
    aisle: "drinks",
    name: "Chilled Zobo & Malt",
    desc: "Ice-cold hibiscus refresh (+15 Hunger, +8 Fun)",
    price: 800,
    emoji: "🧃",
  },
  {
    id: "household",
    aisle: "drinks",
    name: "Home Fresh Essentials",
    desc: "Soap, tea & fresh supplies (+10 Energy, +5 Fun)",
    price: 1800,
    emoji: "🧴",
  },
];

export const SKIN_TONES = ["#3f2618", "#5a3825", "#8d5a3b", "#c68d62", "#e2b594", "#f3d4bd"];
export const HAIR_COLORS = ["#151010", "#4a2a16", "#a8742c", "#c6b493"];
export const ROOM_THEMES = [
  {
    id: "pinterest",
    name: "Pinterest Signature",
    wall: "#f9eff2",
    accent: "#e29cb1",
    sofa: "#d8849d",
    floor: "#f2ece6",
  },
  {
    id: "gallery",
    name: "Warm gallery",
    wall: "#efe7dc",
    accent: "#2f7d68",
    sofa: "#286453",
    floor: "#d8cbbd",
  },
  {
    id: "city",
    name: "City loft",
    wall: "#dfe2e4",
    accent: "#374b58",
    sofa: "#3c4448",
    floor: "#c6c1ba",
  },
  {
    id: "rose",
    name: "Terracotta",
    wall: "#f2dfd9",
    accent: "#a84a5c",
    sofa: "#8e4258",
    floor: "#dfd0c2",
  },
];

export function resolveApartmentPalette(gender: "male" | "female", roomTheme: string) {
  const custom = ROOM_THEMES.find((t) => t.id === roomTheme);
  if (custom && custom.id !== "pinterest") {
    return {
      ...custom,
      trim: gender === "female" ? "#d6b36a" : "#8c6244",
      bedSheet: gender === "female" ? "#f4cbd6" : "#b9cde0",
      pillow: "#fffaf7",
      terraceFloor: "#d2c2b0",
      accentWall: custom.wall,
    };
  }
  if (gender === "female") {
    return {
      id: "pinterest",
      name: "Blush Cream & Gold",
      wall: "#fbf3f5",
      accentWall: "#f4dce3",
      accent: "#e095ab",
      sofa: "#d989a2",
      floor: "#f2ece6",
      trim: "#d8b467",
      bedSheet: "#f3c7d4",
      pillow: "#fffaf7",
      terraceFloor: "#e2d5c8",
    };
  }
  return {
    id: "pinterest",
    name: "Powder Blue & Oak",
    wall: "#f3f6fa",
    accentWall: "#dce7f2",
    accent: "#5b7fa6",
    sofa: "#426180",
    floor: "#eeece8",
    trim: "#8c6244",
    bedSheet: "#bdd2e6",
    pillow: "#ffffff",
    terraceFloor: "#cbb8a0",
  };
}
export type DecorKind = "plant" | "lamp" | "art" | "armchair" | "rug" | "bookshelf" | "table";
export interface DecorItem {
  id: string;
  kind: DecorKind;
  x: number;
  z: number;
  rotation: number;
}
export const DECOR_CATALOG: { kind: DecorKind; name: string; price: number; walkable?: boolean }[] =
  [
    { kind: "plant", name: "Indoor plant", price: 1500 },
    { kind: "lamp", name: "Floor lamp", price: 2000 },
    { kind: "art", name: "Sculpture", price: 2500 },
    { kind: "armchair", name: "Cozy armchair", price: 4500 },
    { kind: "rug", name: "Woven rug", price: 3000, walkable: true },
    { kind: "bookshelf", name: "Bookshelf", price: 5500 },
    { kind: "table", name: "Side table", price: 3500 },
  ];
export const initialLook = (gender: "male" | "female"): Look => ({
  skin: gender === "male" ? "#8d5a3b" : "#c68d62",
  hair: "#151010",
  hairStyle: gender === "male" ? 0 : 2,
  shirt: "#e8e9e3",
  pants: "#253341",
  nails: "",
  tattoo: "none",
});
