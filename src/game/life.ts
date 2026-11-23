import { useGame, saveNow } from "./store";
import { rt } from "./runtime";
import { busy, workAction, eatAction, type Act } from "./actions";
import { landmarkCenter, cityBlocked } from "./world";
import { apartmentBlocked, type Station } from "./sim/apartment";
import { VEHICLE_CATALOG, divorceState, type VehicleKind } from "./sim/mobility";
import { say, speakSubtitle } from "./voice";
import { clamp, naira } from "./rules";

export function enterApartment() {
  if (rt.driving || useGame.getState().wanted || useGame.getState().busy) return;
  Object.assign(rt.player, { x: 0, z: 2, y: 0, speed: 0, heading: Math.PI });
  rt.camYaw = 0; rt.keys.clear(); rt.input.x = 0; rt.input.y = 0;
  useGame.getState().patch({ inside: true, near: null, place: "home", station: null, dialog: null });
  saveNow();
}
export function leaveApartment() {
  if (useGame.getState().busy) return;
  Object.assign(rt.player, { x: 0, z: 11.5, y: 0, speed: 0, heading: 0 });
  rt.camYaw = 0; rt.keys.clear(); rt.input.x = 0; rt.input.y = 0;
  useGame.getState().patch({ inside: false, near: null, station: null, place: "home" });
  saveNow();
}
export function homeActs(station: Station | null): Act[] {
  const s = useGame.getState();
  switch (station) {
    case "bed": return [{ label: "🛏 Sleep", run: () => busy("Sleeping…", 4000, () => { useGame.getState().patch({ energy: 100, time: 7 }); s.notify("Good morning. A fresh start!"); }, "sit") }];
    case "sofa": return [{ label: "🛋 Chill on sofa", run: () => busy("Taking a break…", 4000, () => useGame.getState().patch({ fun: clamp(useGame.getState().fun + 30), energy: clamp(useGame.getState().energy + 15) }), "sit") }];
    case "desk": return [workAction()];
    case "dining": return [eatAction()];
    case "kitchen": return [{ label: `🍳 Cook a meal (${s.ingredients} ingredients)`, disabled: s.ingredients < 1, run: () => busy("Cooking…", 5000, () => { const g = useGame.getState(); g.patch({ ingredients: g.ingredients - 1, meals: g.meals + 2 }); g.addXp(10); g.notify("Two plates ready. Enjoy!"); }) }];
    case "fridge": return [
      { label: `🧊 Store groceries (${s.groceries})`, disabled: s.groceries < 1, run: () => { const g = useGame.getState(); g.patch({ ingredients: g.ingredients + g.groceries, groceries: 0 }); g.notify("Groceries are in the fridge."); } },
      { label: `🥗 Fridge: ${s.ingredients} ingredient packs · ${s.meals} meals`, disabled: true, run: () => {} },
    ];
    case "wardrobe": return [{ label: "👕 Open wardrobe", run: () => s.patch({ dialog: "home" }) }];
    case "bathroom": return [{ label: "🚽 Use bathroom", run: () => busy("In the bathroom…", 2500, () => s.patch({ bladder: 0 })) }];
    case "door": return [{ label: "🚪 Go outside", run: leaveApartment }];
    default: return [];
  }
}
export function purchaseVehicle(kind: VehicleKind) {
  const s = useGame.getState(), item = VEHICLE_CATALOG.find((v) => v.kind === kind);
  if (!item || s.vehicles.some((v) => v.kind === kind)) return;
  if (s.money < item.price) return s.notify("Not enough money yet.");
  const c = landmarkCenter("dealer");
  s.patch({ money: s.money - item.price, vehicles: [...s.vehicles, { id: kind, kind, x: c.x + (kind === "car" ? 5 : -5), z: c.z + 12, heading: Math.PI / 2 }] });
  s.notify(`${item.name} purchased for ${naira(item.price)}. It's parked out front.`);
  saveNow();
}
export function vehicleActs(): Act[] {
  const s = useGame.getState();
  if (s.inside) return [];
  if (rt.driving) return [{ label: "🚪 Park & get out", run: () => {
    const vehicle = s.vehicles.find((v) => v.id === rt.driving);
    if (!vehicle) return;
    const candidates = [[vehicle.x + 2.5, vehicle.z], [vehicle.x - 2.5, vehicle.z], [vehicle.x, vehicle.z + 3], [vehicle.x, vehicle.z - 3]];
    const spot = candidates.find(([x, z]) => x !== undefined && z !== undefined && !cityBlocked(x, z));
    if (!spot) return s.notify("There's no room here. Park somewhere open.");
    rt.player.x = spot[0] ?? vehicle.x; rt.player.z = spot[1] ?? vehicle.z;
    rt.driving = null; rt.vehicleSpeed = 0; rt.player.speed = 0;
    s.patch({ vehicles: [...s.vehicles] }); saveNow();
  } }];
  const near = s.vehicles.find((v) => Math.hypot(v.x - rt.player.x, v.z - rt.player.z) < 4);
  if (!near) return [];
  return [{ label: near.kind === "car" ? "🚘 Drive your car" : "🚲 Ride your bike", run: () => {
    rt.driving = near.id; rt.vehicleSpeed = 0;
    Object.assign(rt.player, { x: near.x, z: near.z, heading: near.heading });
    rt.camYaw = near.heading; s.patch({ vehicles: [...s.vehicles] });
  } }];
}
export function confirmDivorce() {
  const s = useGame.getState(), partner = s.partner;
  if (!partner) return;
  const n = rt.npcs.find((npc) => npc.id === partner.id);
  const mine = "I think we should go our separate ways.", theirs = "If that's what you want, goodbye.";
  s.notify(`You: “${mine}”\n${partner.name}: “${theirs}”`);
  say(mine, s.profile?.gender ?? "male", s.muted); say(theirs, n?.gender ?? "female", s.muted);
  if (n) { n.base = n.role === "walker" ? "walk" : "wander"; n.mode = n.base; n.tx = n.x; n.tz = n.z; }
  const affection = { ...s.affection }; delete affection[String(partner.id)];
  s.patch({ partner: divorceState(true, partner), affection, near: s.near ? { ...s.near, isPartner: false } : null, dialog: null });
  saveNow();
}
export function safeApartmentPosition(x: number, z: number) {
  return apartmentBlocked(x, z) ? { x: 0, z: 2 } : { x, z };
}
export { speakSubtitle };