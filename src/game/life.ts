import { useGame, saveNow, type TryOnMode } from "./store";
import { rt } from "./runtime";
import {
  busy,
  workAction,
  eatAction,
  seatPlayer,
  standUp,
  stopDancing,
  addStat,
  requestPurchase,
  requestDrinkPurchase,
  type Act,
} from "./actions";
import { landmarkCenter, cityBlocked, BUILDING_DOORS, onAsphaltRoad } from "./world";
import {
  apartmentBlocked,
  APARTMENT_SEATS,
  insideHomeBathroom,
  type Station,
} from "./sim/apartment";
import {
  INTERIORS,
  clubInteriorIsBar,
  clubInteriorIsFloor,
  nearestInteriorSeat,
  type BuildingKind,
} from "./sim/interiors";
import { MARKET_ITEMS } from "./catalog";
import { createInteriorNpcs } from "./npcs";
import { VEHICLE_CATALOG, divorceState, type VehicleKind } from "./sim/mobility";
import { say, speakSubtitle } from "./voice";
import { PRICES, HOUSES, RIDE_TIERS, naira } from "./rules";

export function enterBuilding(kind: BuildingKind) {
  const s = useGame.getState();
  if (rt.driving || s.busy) return;
  if (kind === "home" && s.wanted > 0) {
    s.notify("🚓 Police are looking for you—you can't hide at home!");
    return;
  }
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.exitPos = null;
  rt.doorLocked = false;
  rt.keys.clear();
  rt.input.x = 0;
  rt.input.y = 0;

  if (kind === "home") {
    rt.interiorNpcs = [];
    Object.assign(rt.player, { x: 0, z: 2, y: 0, speed: 0, heading: Math.PI });
    rt.camYaw = 0;
  } else {
    const spec = INTERIORS[kind];
    rt.interiorNpcs = createInteriorNpcs(kind);
    Object.assign(rt.player, {
      x: spec.spawn.x,
      z: spec.spawn.z,
      y: 0,
      speed: 0,
      heading: spec.spawn.heading,
    });
    rt.camYaw = 0;
  }

  useGame.getState().patch({
    inside: true,
    interior: kind,
    near: null,
    place: kind,
    station: null,
    interiorStation: null,
    dialog: null,
    tryOn: null,
    previewLook: null,
    pendingPurchase: null,
  });
  saveNow();
}

export function leaveBuilding() {
  const s = useGame.getState();
  if (s.busy) return;
  const kind: BuildingKind = s.interior ?? "home";
  const door = BUILDING_DOORS[kind];
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.exitPos = null;
  rt.doorLocked = false;
  rt.interiorNpcs = [];
  Object.assign(rt.player, {
    x: door.outX,
    z: door.outZ,
    y: 0,
    speed: 0,
    heading: door.outHeading,
  });
  rt.camYaw = 0;
  rt.keys.clear();
  rt.input.x = 0;
  rt.input.y = 0;
  useGame.getState().patch({
    inside: false,
    interior: null,
    near: null,
    station: null,
    interiorStation: null,
    place: kind,
    dialog: null,
    tryOn: null,
    previewLook: null,
    pendingPurchase: null,
  });
  saveNow();
}

export function enterApartment() {
  enterBuilding("home");
}

export function leaveApartment() {
  leaveBuilding();
}

export function startTryOn(mode: Exclude<TryOnMode, null>) {
  const s = useGame.getState();
  if (!s.profile) return;
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.speed = 0;
  if (s.interior === "boutique") {
    // Move player cleanly onto the illuminated Boutique Mirror Platform facing the mirror/camera
    rt.player.x = 0;
    rt.player.z = -1.7;
    rt.player.heading = 0;
    rt.tryOnYaw = 0;
  } else if (s.interior === "ink") {
    rt.player.x = 0;
    rt.player.z = -2.0;
    rt.player.heading = 0;
    rt.tryOnYaw = 0.85; // angle toward tattooed arm
  } else if (s.interior === "home") {
    rt.player.x = -1.7;
    rt.player.z = -3.6;
    rt.player.heading = 0;
    rt.tryOnYaw = 0;
  }
  s.patch({
    tryOn: mode,
    previewLook: { ...s.profile.look },
    dialog: null,
  });
}

export function cancelTryOn() {
  useGame.getState().patch({
    tryOn: null,
    previewLook: null,
    pendingPurchase: null,
  });
}

export function buyMarketItem(itemId: (typeof MARKET_ITEMS)[number]["id"]) {
  const item = MARKET_ITEMS.find((m) => m.id === itemId);
  if (!item) return;
  requestPurchase({
    title: item.name,
    preview: `${item.emoji} ${item.desc}`,
    price: item.price,
    onConfirm: () => {
      const g = useGame.getState();
      if (item.id === "groceries") {
        g.patch({ groceries: g.groceries + 1 });
        g.notify("🥬 Groceries bought! Store them in your apartment fridge.");
      } else if (item.id === "fruit") {
        addStat("hunger", 25);
        g.notify("🥭 Sweet fresh fruit basket! +25 Hunger");
      } else if (item.id === "puffpuff") {
        addStat("hunger", 20);
        g.notify("🍩 Hot puff-puff! +20 Hunger");
      } else if (item.id === "suya") {
        addStat("hunger", 35);
        addStat("fun", 5);
        g.notify("🔥 Suya with yaji pepper! +35 Hunger");
      } else if (item.id === "zobo") {
        addStat("hunger", 15);
        addStat("fun", 8);
        g.notify("🧃 Ice-cold Zobo & Malt! Refreshing!");
      } else if (item.id === "household") {
        addStat("energy", 10);
        addStat("fun", 5);
        g.notify("🧴 Home fresh essentials picked up!");
      }
    },
  });
}

function snapToApartmentSeat(key: keyof typeof APARTMENT_SEATS) {
  const seat = APARTMENT_SEATS[key];
  if (!seat) return;
  seatPlayer(seat.seatX, seat.seatZ, seat.heading, seat.sitY, seat.exitX, seat.exitZ, seat.kind);
}

export function homeActs(station: Station | null): Act[] {
  const s = useGame.getState();

  if (rt.player.act === "sit") {
    const acts: Act[] = [{ label: "🧍 Stand Up", run: standUp }];
    if (station === "desk") acts.unshift(workAction(() => snapToApartmentSeat("desk")));
    if (station === "dining") acts.unshift(eatAction(() => snapToApartmentSeat("dining")));
    return acts;
  }

  switch (station) {
    case "bed":
      return [
        {
          label: "🛏 Sleep",
          run: () => {
            snapToApartmentSeat("bed");
            busy(
              "Sleeping…",
              4000,
              () => {
                useGame.getState().patch({ energy: 100, time: 7 });
                standUp();
                s.notify("Good morning. A fresh start!");
              },
              "sleep",
            );
          },
        },
      ];
    case "sofa":
      return [{ label: "🛋 Sit / Relax", run: () => snapToApartmentSeat("sofa") }];
    case "desk":
      return [
        workAction(() => snapToApartmentSeat("desk")),
        { label: "🪑 Sit / Relax", run: () => snapToApartmentSeat("desk") },
      ];
    case "dining":
      return [
        eatAction(() => snapToApartmentSeat("dining")),
        { label: "🪑 Sit / Relax", run: () => snapToApartmentSeat("dining") },
      ];
    case "kitchen":
      return [
        {
          label: `🍳 Cook a meal (${s.ingredients} ingredients)`,
          disabled: s.ingredients < 1,
          run: () =>
            busy("Cooking…", 5000, () => {
              const g = useGame.getState();
              g.patch({ ingredients: g.ingredients - 1, meals: g.meals + 2 });
              g.addXp(10);
              g.notify("Two plates ready. Enjoy!");
            }),
        },
      ];
    case "fridge":
      return [
        {
          label: `🧊 Store groceries (${s.groceries})`,
          disabled: s.groceries < 1,
          run: () => {
            const g = useGame.getState();
            g.patch({ ingredients: g.ingredients + g.groceries, groceries: 0 });
            g.notify("Groceries are in the fridge.");
          },
        },
        {
          label: `🥗 Fridge: ${s.ingredients} ingredient packs · ${s.meals} meals`,
          disabled: true,
          run: () => {},
        },
      ];
    case "wardrobe":
      return [{ label: "👕 Open 3D Wardrobe Closet", run: () => startTryOn("wardrobe") }];
    case "terrace":
      return [{ label: "🌴 Sit / Relax on Terrace", run: () => snapToApartmentSeat("terrace") }];
    case "garage":
      return [{ label: "⬆️ Upgrade House & Ride", run: () => s.patch({ dialog: "upgrade" }) }];
    case "bathroom":
      if (!insideHomeBathroom(rt.player.x, rt.player.z)) return [];
      return [
        {
          label: "🚽 Use Toilet",
          run: () => {
            rt.doorLocked = true;
            snapToApartmentSeat("toilet");
            busy(
              "Using toilet…",
              2500,
              () => {
                s.patch({ bladder: 0 });
                rt.doorLocked = false;
                standUp();
                s.notify("😌 All fresh! Door unlocked.");
              },
              "sit",
            );
          },
        },
      ];
    case "door":
      return [{ label: "🚪 Go outside", run: leaveBuilding }];
    default:
      return [];
  }
}

export function interiorActs(kind: Exclude<BuildingKind, "home">, station: string | null): Act[] {
  const s = useGame.getState();
  const px = rt.player.x;
  const pz = rt.player.z;

  if (rt.player.act === "dance") {
    return [{ label: "🛑 Stop Dancing", run: stopDancing }];
  }
  if (rt.player.act === "sit") {
    const acts: Act[] = [{ label: "🧍 Stand Up", run: standUp }];
    if (kind === "club" && clubInteriorIsBar(px, pz)) {
      acts.unshift({
        label: `🍹 Buy Drink (Chapman ${naira(PRICES.drink)})`,
        run: requestDrinkPurchase,
      });
    }
    return acts;
  }

  const nearSeat = nearestInteriorSeat(kind, px, pz);
  const acts: Act[] = [];

  switch (kind) {
    case "market": {
      if (station === "produce") {
        acts.push(
          {
            label: `🥬 Jollof Ingredients (${naira(PRICES.ingredients)})`,
            run: () => buyMarketItem("groceries"),
          },
          {
            label: `🥭 Fresh Fruit Basket (${naira(PRICES.fruit)})`,
            run: () => buyMarketItem("fruit"),
          },
        );
      } else if (station === "grill") {
        acts.push(
          {
            label: `🍩 Hot Puff-Puff (${naira(PRICES.puffpuff)})`,
            run: () => buyMarketItem("puffpuff"),
          },
          {
            label: `🍢 Pepper Suya (${naira(PRICES.suya)})`,
            run: () => buyMarketItem("suya"),
          },
        );
      } else if (station === "drinks") {
        acts.push(
          {
            label: `🧃 Chilled Zobo (${naira(PRICES.zobo)})`,
            run: () => buyMarketItem("zobo"),
          },
          {
            label: `🧴 Home Essentials (${naira(PRICES.household)})`,
            run: () => buyMarketItem("household"),
          },
        );
      } else if (station === "checkout") {
        acts.push({
          label: "🛒 Browse All Supermarket Aisles",
          run: () => s.patch({ dialog: "market" }),
        });
      }
      break;
    }
    case "boutique": {
      if (station === "clothes" || station === "mirror") {
        acts.push({ label: "👗 Try On Outfits (Mirror)", run: () => startTryOn("clothes") });
      }
      if (station === "hair") {
        acts.push({ label: "💇 Hair Styling Try-On", run: () => startTryOn("hair") });
      }
      if (station === "nails") {
        acts.push({ label: "💅 Nail Station Try-On", run: () => startTryOn("nails") });
      }
      if (station === "mirror" && !acts.some((a) => a.label.includes("Hair"))) {
        acts.push(
          { label: "💇 Hair Styling Try-On", run: () => startTryOn("hair") },
          { label: "💅 Nail Station Try-On", run: () => startTryOn("nails") },
        );
      }
      break;
    }
    case "ink": {
      if (station === "tattoo") {
        acts.push({ label: "🖋️ Browse & Try On Tattoos", run: () => startTryOn("tattoo") });
      }
      break;
    }
    case "club": {
      if (station === "bar" || clubInteriorIsBar(px, pz)) {
        acts.push({
          label: `🍹 Buy Drink (Chapman ${naira(PRICES.drink)})`,
          run: requestDrinkPurchase,
        });
      } else if (station === "floor" || clubInteriorIsFloor(px, pz)) {
        acts.push({
          label: "💃 Dance",
          run: () => {
            rt.player.act = "dance";
          },
        });
      }
      break;
    }
    case "realtor": {
      if (station === "desk") {
        acts.push({
          label: "🔑 Browse Property Upgrades",
          run: () => s.patch({ dialog: "realtor" }),
        });
      }
      break;
    }
    case "school": {
      if (station === "podium") {
        acts.push({
          label: `📚 Attend Class (${naira(PRICES.school)})`,
          run: () =>
            requestPurchase({
              title: "Attend City High Class",
              preview: "🎓 Boost XP (+45 XP) and build city respect (-10 Energy)",
              price: PRICES.school,
              onConfirm: () =>
                busy("In class, learning…", 6000, () => {
                  useGame.getState().addXp(45);
                  addStat("energy", -10);
                  useGame.getState().notify("🎓 You learned a lot. +45 XP");
                }),
            }),
        });
      }
      break;
    }
    case "church": {
      if (station === "altar") {
        acts.push({
          label: `🙏 Attend Service (Offering ${naira(PRICES.offering)})`,
          run: () =>
            requestPurchase({
              title: "Cathedral Service & Offering",
              preview: "⛪ Praise & gratitude (+30 XP, +15 Fun)",
              price: PRICES.offering,
              onConfirm: () =>
                busy(
                  "Praising in church…",
                  5000,
                  () => {
                    useGame.getState().addXp(30);
                    addStat("fun", 15);
                    useGame.getState().notify("⛪ Blessed! +30 XP");
                  },
                  "dance",
                ),
            }),
        });
      }
      break;
    }
    case "dealer": {
      if (station === "sales" || station === "bike" || station === "car") {
        acts.push({ label: "🚘 Browse Vehicles", run: () => s.patch({ dialog: "dealer" }) });
      }
      break;
    }
    case "police": {
      if (station === "desk") {
        if (s.wanted > 0) {
          acts.push({
            label: `⚖️ Pay Police Bail (${naira(20_000)})`,
            run: () =>
              requestPurchase({
                title: "Clear Wanted Record",
                preview: "🚓 Pay bail at the front desk to clear your stars",
                price: 20_000,
                onConfirm: () => {
                  useGame.getState().patch({ wanted: 0 });
                  useGame.getState().notify("📋 Wanted stars cleared!");
                },
              }),
          });
        } else {
          acts.push({ label: "📋 Citizen Record: Clean", disabled: true, run: () => {} });
        }
      }
      break;
    }
  }

  if (nearSeat) {
    acts.push({
      label: `🪑 Sit (${nearSeat.title})`,
      run: () =>
        seatPlayer(
          nearSeat.seatX,
          nearSeat.seatZ,
          nearSeat.heading,
          nearSeat.sitY,
          nearSeat.exitX,
          nearSeat.exitZ,
          "sit",
        ),
    });
  }

  if (station === "door") {
    acts.push({ label: "🚪 Go outside", run: leaveBuilding });
  }

  return acts;
}

export function requestHouseUpgrade(tierIndex: number) {
  const s = useGame.getState();
  const h = HOUSES[tierIndex];
  if (!h || tierIndex <= s.house) return;
  requestPurchase({
    title: `Upgrade to ${h.name}`,
    preview: `🏡 ${h.desc} (+100 XP)`,
    price: h.price,
    onConfirm: () => {
      const cur = useGame.getState();
      cur.patch({ house: tierIndex, dialog: null });
      cur.addXp(100);
      cur.notify(`🏡 Upgraded to ${h.name}! Your terrace & apartment decor expanded.`);
    },
  });
}

export function requestRideUpgrade(tier: number) {
  const s = useGame.getState();
  const item = RIDE_TIERS.find((r) => r.tier === tier);
  if (!item || tier <= s.rideTier) return;
  requestPurchase({
    title: `Upgrade Ride: ${item.name}`,
    preview: `🚘 ${item.desc} (+50 XP)`,
    price: item.price,
    onConfirm: () => {
      const st = useGame.getState();
      const home = BUILDING_DOORS.home;
      const roadZ = Math.round((home.outZ - 16) / 32) * 32 + 16 - 2; // z = 14.0 on asphalt road in front of home
      const spawnX = onAsphaltRoad(home.doorX, roadZ, 1.2) ? home.doorX : 0;
      const withoutGarageRide = st.vehicles.filter(
        (v) => v.id !== "player-ride" && v.kind !== item.kind,
      );
      st.patch({
        rideTier: tier,
        vehicles: [
          ...withoutGarageRide,
          { id: "player-ride", kind: item.kind, x: spawnX, z: roadZ, heading: Math.PI / 2 },
        ],
      });
      st.addXp(50);
      st.notify(`🚘 Unlocked ${item.name}! Parked in your garage bay & on the street outside.`);
    },
  });
}

export function purchaseVehicle(kind: VehicleKind) {
  const s = useGame.getState();
  const item = VEHICLE_CATALOG.find((v) => v.kind === kind);
  if (!item || s.vehicles.some((v) => v.kind === kind)) return;
  const matchedTier = RIDE_TIERS.find((r) => r.kind === kind)?.tier ?? s.rideTier;
  requestPurchase({
    title: item.name,
    preview: `${kind === "car" || kind === "supercar" ? "🚘" : kind === "moto" ? "🏍️" : "🚲"} Parked on the street outside City Motors`,
    price: item.price,
    onConfirm: () => {
      const st = useGame.getState();
      const c = landmarkCenter("dealer");
      const roadZ = c.z + 15.0; // strictly on asphalt avenue outside dealer
      st.patch({
        rideTier: Math.max(st.rideTier, matchedTier),
        vehicles: [
          ...st.vehicles,
          {
            id: kind,
            kind,
            x: c.x + (kind === "car" || kind === "supercar" ? 4 : -4),
            z: roadZ,
            heading: Math.PI / 2,
          },
        ],
      });
      st.notify(
        `${item.name} purchased for ${naira(item.price)}. It's parked on the road out front.`,
      );
    },
  });
}

export function vehicleActs(): Act[] {
  const s = useGame.getState();
  if (s.inside) return [];
  if (rt.driving)
    return [
      {
        label: "🚪 Park & get out",
        run: () => {
          const vehicle = s.vehicles.find((v) => v.id === rt.driving);
          if (!vehicle) return;
          const candidates = [
            [vehicle.x + 2.5, vehicle.z],
            [vehicle.x - 2.5, vehicle.z],
            [vehicle.x, vehicle.z + 3],
            [vehicle.x, vehicle.z - 3],
          ];
          const spot = candidates.find(
            ([x, z]) => x !== undefined && z !== undefined && !cityBlocked(x, z),
          );
          if (!spot) return s.notify("There's no room here. Park somewhere open.");
          rt.player.x = spot[0] ?? vehicle.x;
          rt.player.z = spot[1] ?? vehicle.z;
          rt.driving = null;
          rt.vehicleSpeed = 0;
          rt.player.speed = 0;
          rt.player.act = null;
          rt.player.sitY = 0;
          s.patch({ vehicles: [...s.vehicles] });
          saveNow();
        },
      },
    ];
  const near = s.vehicles.find((v) => Math.hypot(v.x - rt.player.x, v.z - rt.player.z) < 4);
  if (!near) return [];
  const label =
    near.kind === "supercar"
      ? "🏎️ Drive your sports car"
      : near.kind === "car"
        ? "🚘 Drive your car"
        : near.kind === "moto"
          ? "🏍️ Ride your power bike"
          : "🚲 Ride your bike";
  return [
    {
      label,
      run: () => {
        rt.driving = near.id;
        rt.vehicleSpeed = 0;
        rt.player.act = null;
        rt.player.sitY = 0;
        Object.assign(rt.player, { x: near.x, z: near.z, heading: near.heading });
        rt.camYaw = near.heading;
        s.patch({ vehicles: [...s.vehicles] });
      },
    },
  ];
}

export function confirmDivorce() {
  const s = useGame.getState();
  const partner = s.partner;
  if (!partner) return;
  const n = rt.npcs.find((npc) => npc.id === partner.id);
  const mine = "I think we should go our separate ways.";
  const theirs = "If that's what you want, goodbye.";
  s.notify(`You: “${mine}”\n${partner.name}: “${theirs}”`);
  say(mine, s.profile?.gender ?? "male", s.muted, (ms) => {
    rt.player.talkUntil = Date.now() + ms;
  });
  say(theirs, n?.gender ?? "female", s.muted, (ms) => {
    if (n) n.talkUntil = Date.now() + ms;
  });
  if (n) {
    n.base = n.role === "walker" ? "walk" : "wander";
    n.mode = n.base;
    n.tx = n.x;
    n.tz = n.z;
  }
  const affection = { ...s.affection };
  delete affection[String(partner.id)];
  s.patch({
    partner: divorceState(true, partner),
    affection,
    near: s.near ? { ...s.near, isPartner: false } : null,
    dialog: null,
  });
  saveNow();
}

export function safeApartmentPosition(x: number, z: number) {
  return apartmentBlocked(x, z) ? { x: 0, z: 2 } : { x, z };
}
export { speakSubtitle };
