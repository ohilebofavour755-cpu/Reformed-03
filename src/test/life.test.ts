import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  apartmentBlocked,
  moveSwept,
  nearStation,
  insideHomeBathroom,
  TERRACE_BOUNDS,
  insideTerrace,
  insideGarage,
} from "@/game/sim/apartment";
import {
  cityBlocked,
  insidePublicRestroom,
  isNearClubBar,
  isOnDanceFloor,
  PUBLIC_RESTROOM,
  BUILDING_DOORS,
  nearBuildingDoor,
  landmarkCenter,
  onAsphaltRoad,
  vehicleRoadBlocked,
  BEACH_X,
  ROAD_SAFETY_POSTS,
} from "@/game/world";
import { createNpcs, stepNpcs, createCars, stepCars } from "@/game/npcs";
import { interiorBlocked, nearInteriorStation, insidePoliceCell } from "@/game/sim/interiors";
import { AUTOSAVE_MS, divorceState, crashResult, driveStep } from "@/game/sim/mobility";
import { speakSubtitle } from "@/game/voice";
import {
  placeActions,
  npcActions,
  confirmPendingPurchase,
  cancelPendingPurchase,
  triggerPoliceCatch,
  payArrestFine,
  startPoliceEscort,
  lockInPoliceJailCell,
} from "@/game/actions";
import {
  enterBuilding,
  leaveBuilding,
  interiorActs,
  startTryOn,
  cancelTryOn,
  buyMarketItem,
  requestHouseUpgrade,
  requestRideUpgrade,
} from "@/game/life";
import { initialLook, resolveApartmentPalette } from "@/game/catalog";
import { useGame } from "@/game/store";
import { rt } from "@/game/runtime";
import { PRICES, START_MONEY, POLICE_FINE, HOUSES } from "@/game/rules";
import { GLB_PUBLIC_URLS } from "@/game/glbRegistry";

describe("planned life-game rules", () => {
  beforeEach(() => {
    rt.player.act = null;
    rt.player.sitY = 0;
    rt.player.exitPos = null;
    rt.driving = null;
    rt.interiorNpcs = [];
    useGame.getState().patch({
      profile: { name: "Kemi", gender: "female", look: initialLook("female") },
      money: START_MONEY,
      hunger: 50,
      energy: 80,
      fun: 50,
      groceries: 0,
      inside: false,
      interior: null,
      house: 0,
      rideTier: 0,
      vehicles: [],
      wanted: 0,
      jailUntil: 0,
      arrestStage: null,
      pendingPurchase: null,
      tryOn: null,
      previewLook: null,
      dialog: null,
      near: null,
      busy: null,
    });
  });

  it("autosaves every 10 seconds", () => expect(AUTOSAVE_MS).toBe(10_000));

  it("apartment spawn is inside and clear of walls and furniture", () => {
    expect(apartmentBlocked(0, 2)).toBe(false);
    expect(apartmentBlocked(-4.7, -3.6)).toBe(true);
    expect(nearStation(0, 5)).toBe("door");
  });

  it("cannot walk through any apartment wall, even in a large step", () => {
    for (const [dx, dz] of [
      [50, 0],
      [-50, 0],
      [0, 50],
      [0, -50],
    ]) {
      const p = { x: 0, z: 2 };
      moveSwept(p, dx ?? 0, dz ?? 0, apartmentBlocked);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(6.6);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(5.6);
      expect(apartmentBlocked(p.x, p.z)).toBe(false);
    }
  });

  it("only exposes bathroom toilet station when inside the enclosed home bathroom", () => {
    expect(insideHomeBathroom(0, 2)).toBe(false);
    expect(nearStation(-3.2, 4.9)).not.toBe("bathroom"); // outside the bathroom wall
    expect(insideHomeBathroom(-5.2, 4.5)).toBe(true);
    expect(nearStation(-5.2, 4.5)).toBe("bathroom");
  });

  it("hides toilet outdoors and only shows Use Toilet inside the enclosed Public Restroom", () => {
    rt.player.act = null;
    const chill = landmarkCenter("chill");
    rt.player.x = chill.x;
    rt.player.z = chill.z;
    expect(insidePublicRestroom(rt.player.x, rt.player.z)).toBe(false);
    expect(
      placeActions("chill").some((a) => a.label.includes("Toilet") || a.label.includes("toilet")),
    ).toBe(false);

    rt.player.x = PUBLIC_RESTROOM.x;
    rt.player.z = PUBLIC_RESTROOM.z + 0.5;
    expect(insidePublicRestroom(rt.player.x, rt.player.z)).toBe(true);
    expect(placeActions("chill").some((a) => a.label.includes("Use Toilet"))).toBe(true);
  });

  it("removes outdoor sidewalk purchase popups and detects physical building doors", () => {
    for (const kind of [
      "market",
      "boutique",
      "ink",
      "realtor",
      "school",
      "church",
      "dealer",
    ] as const) {
      const door = BUILDING_DOORS[kind];
      rt.player.x = door.outX;
      rt.player.z = door.outZ;
      expect(nearBuildingDoor(rt.player.x, rt.player.z)).toBe(kind);
      expect(placeActions(kind)).toEqual([]);
    }
    const clubCenter = landmarkCenter("club");
    expect(cityBlocked(clubCenter.x, clubCenter.z)).toBe(true);
    const marketCenter = landmarkCenter("market");
    expect(cityBlocked(marketCenter.x, marketCenter.z)).toBe(true);
  });

  it("enters and exits walk-in buildings and keeps player bounded inside interior walls", () => {
    enterBuilding("market");
    expect(useGame.getState().inside).toBe(true);
    expect(useGame.getState().interior).toBe("market");
    expect(rt.interiorNpcs.length).toBeGreaterThan(0);

    const p = { x: rt.player.x, z: rt.player.z };
    moveSwept(p, 50, -50, (x, z) => interiorBlocked("market", x, z));
    expect(interiorBlocked("market", p.x, p.z)).toBe(false);

    // Near produce aisle inside Balogun Supermarket
    expect(nearInteriorStation("market", -3.0, -2.0)).toBe("produce");
    leaveBuilding();
    expect(useGame.getState().inside).toBe(false);
    expect(useGame.getState().interior).toBeNull();
  });

  it("Club Amapiano offers free continuous dance on floor and Buy Drink only at the bar", () => {
    expect(PRICES.dance).toBe(0);
    const club = landmarkCenter("club");
    rt.player.act = null;
    rt.player.x = club.x;
    rt.player.z = club.z + 1;
    expect(isOnDanceFloor(rt.player.x, rt.player.z)).toBe(true);
    expect(isNearClubBar(rt.player.x, rt.player.z)).toBe(false);
    const floorActs = placeActions("club");
    expect(floorActs.some((a) => a.label.includes("Dance"))).toBe(true);
    expect(floorActs.some((a) => a.label.includes("Drink"))).toBe(false);

    rt.player.x = club.x;
    rt.player.z = club.z - 7.5;
    expect(isNearClubBar(rt.player.x, rt.player.z)).toBe(true);
    const barActs = placeActions("club");
    expect(barActs.some((a) => a.label.includes("Buy Drink"))).toBe(true);
  });

  it("requires confirmation before deducting money on purchases", () => {
    const startMoney = useGame.getState().money;
    buyMarketItem("suya");
    // Money MUST NOT leave until confirmed
    expect(useGame.getState().money).toBe(startMoney);
    expect(useGame.getState().pendingPurchase?.price).toBe(PRICES.suya);

    cancelPendingPurchase();
    expect(useGame.getState().money).toBe(startMoney);
    expect(useGame.getState().pendingPurchase).toBeNull();

    buyMarketItem("suya");
    confirmPendingPurchase();
    expect(useGame.getState().money).toBe(startMoney - PRICES.suya);
    expect(useGame.getState().hunger).toBeGreaterThan(50);
  });

  it("supports Live 3D Try-On in boutique & ink studio and reverts cleanly on cancel", () => {
    enterBuilding("boutique");
    const acts = interiorActs("boutique", "mirror");
    expect(acts.some((a) => a.label.includes("Try On"))).toBe(true);
    startTryOn("nails");
    expect(useGame.getState().tryOn).toBe("nails");
    useGame.getState().patch({
      previewLook: { ...useGame.getState().profile!.look, nails: "#d90429" },
    });
    expect(useGame.getState().profile?.look.nails).toBe("");
    cancelTryOn();
    expect(useGame.getState().tryOn).toBeNull();
    expect(useGame.getState().previewLook).toBeNull();
  });

  it("populates a thinned, well-spaced city crowd and maps all 10 character GLBs without gossip", () => {
    expect(GLB_PUBLIC_URLS.maleplayer[0]).toBe(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/Maleplayer.glb",
    );
    expect(GLB_PUBLIC_URLS.fplayer[0]).toBe(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/Fplayer.glb",
    );
    expect(GLB_PUBLIC_URLS.mannpc[0]).toBe(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/Mannpc.glb",
    );
    expect(GLB_PUBLIC_URLS.femalenpc[0]).toBe(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/Femalenpc.glb",
    );
    expect(GLB_PUBLIC_URLS.ch).toContain(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/C%26h.glb",
    );
    expect(GLB_PUBLIC_URLS.police).toContain("/police.glb");
    expect(GLB_PUBLIC_URLS.trampoline[0]).toBe("/trampoline.glb");
    expect(GLB_PUBLIC_URLS.bicyclenpc[0]).toBe(
      "https://ohilebofavour755-cpu.github.io/Reformed-03/bicyclenpc.glb",
    );
    expect(GLB_PUBLIC_URLS.beachmale[0]).toBe("/Beachmale.glb");
    expect(GLB_PUBLIC_URLS.beach[0]).toBe("/Beach.glb");

    const npcs = createNpcs(0, 0);
    expect(npcs.length).toBeGreaterThanOrEqual(50);
    expect(npcs.length).toBeLessThanOrEqual(105);
    const roles = new Set(npcs.map((n) => n.role));
    for (const r of [
      "bicyclist",
      "trampoline",
      "police",
      "hookup",
      "thug",
      "beach",
      "roadsafety",
    ] as const) {
      expect(roles.has(r)).toBe(true);
    }

    // Active outdoor NPCs never spawn stacked directly on top of one another
    const active = npcs.filter((n) => n.mode !== "off");
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const d = Math.hypot(active[i]!.x - active[j]!.x, active[i]!.z - active[j]!.z);
        expect(d).toBeGreaterThan(0.75);
      }
    }

    enterBuilding("ink");
    const npc = rt.interiorNpcs[0]!;
    useGame.getState().patch({
      near: {
        id: npc.id,
        name: npc.name,
        gender: npc.gender,
        isPartner: false,
        isInterior: true,
      },
    });
    const acts = npcActions();
    expect(acts.some((a) => a.label.includes("Eavesdrop"))).toBe(false);
    leaveBuilding();
  });

  it("moves leaving NPCs one-way toward their exit without reversing mid-trip and separates clumped NPCs", () => {
    const npcs = createNpcs(0, 0).slice(0, 2);
    const [a, b] = npcs;
    // Test committed one-way leaving trajectory
    a!.role = "walker";
    a!.mode = "leaving";
    a!.x = 0;
    a!.z = 12;
    a!.tx = 0;
    a!.tz = 60;
    a!.dirX = 0;
    a!.dirZ = 1;

    // Place b right on top of a's starting point to test separation, then keep a advancing one-way
    b!.role = "walker";
    b!.mode = "wander";
    b!.x = 0.1;
    b!.z = 12.1;
    b!.tx = -8;
    b!.tz = 12.1;

    stepNpcs([a!, b!], 0.1, 0, 0);
    expect(Math.hypot(a!.x - b!.x, a!.z - b!.z)).toBeGreaterThan(0.15);

    // Step leaving NPC forward repeatedly; z must monotonically increase toward tx/tz=60
    let prevZ = a!.z;
    for (let i = 0; i < 12; i++) {
      stepNpcs([a!], 0.25, 0, 0);
      expect(a!.mode).toBe("leaving");
      expect(a!.z).toBeGreaterThan(prevZ);
      prevZ = a!.z;
    }
  });

  it("keeps traffic vehicles on asphalt roads and blocks FRSC road safety checkpoints", () => {
    const cars = createCars(32, 0, 0);
    expect(cars.length).toBe(32);
    for (let i = 0; i < 60; i++) stepCars(cars, 0.05, 0, 0);
    for (const c of cars) {
      expect(c.x).toBeLessThan(BEACH_X);
      expect(onAsphaltRoad(c.x, c.z, 0.9)).toBe(true);
    }
    for (const post of ROAD_SAFETY_POSTS) {
      expect(cityBlocked(post.x, post.z, 0.3)).toBe(true);
    }
  });

  it("cannot run or drive through exterior walls", () => {
    const p = { x: 0, z: 12 };
    moveSwept(p, 0, -30, (x, z) => cityBlocked(x, z, 1.25));
    expect(p.z).toBeGreaterThanOrEqual(9.25);
    expect(cityBlocked(0, 0)).toBe(true);
  });

  it("divorce only ends marriage after confirmation", () => {
    const partner = { id: 5, name: "Maya" };
    expect(divorceState(false, partner)).toEqual(partner);
    expect(divorceState(true, partner)).toBeNull();
  });

  it("vehicle collisions produce smoke but never death", () => {
    expect(crashResult()).toEqual({ fatal: false, smoke: true, speedMultiplier: 0.15 });
  });

  it("vehicles accelerate and brake instead of moving instantly", () => {
    const v = { speed: 0, heading: 0 };
    const step = driveStep(v, 1, 0, 0.05, "car");
    expect(step.dz).toBeGreaterThan(0);
    expect(step.dx).toBe(0);
    expect(v.speed).toBeLessThan(22);
  });

  it("spoken NPC words resolve a preloaded neural clip and match the subtitle", () => {
    vi.stubGlobal(
      "Audio",
      class {
        volume = 1;
        muted = false;
        preload = "auto";
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        play = vi.fn().mockResolvedValue(undefined);
      },
    );
    const notify = vi.fn();
    const line = "Damn! Look where you're going!";
    const clip = speakSubtitle("Alex", line, "male", false, notify);
    expect(clip).not.toBeNull();
    expect(clip?.url).toMatch(/^\/voices\/m-.*\.mp3$/);
    expect(notify).toHaveBeenCalledWith(`Alex: “${line}”`);
  });

  it("keeps driving strictly on asphalt roads and blocks beach sand and ocean", () => {
    // Center of E-W road at z = 16, x = 0 is pure asphalt
    expect(onAsphaltRoad(0, 16, 1.25)).toBe(true);
    expect(vehicleRoadBlocked(0, 16, 1.25)).toBe(false);
    // Beach sand (x = 58) & ocean (x = 85) & city block interior (x = 32, z = 32) are blocked
    expect(onAsphaltRoad(58, 16, 1.25)).toBe(false);
    expect(vehicleRoadBlocked(58, 16, 1.25)).toBe(true);
    expect(vehicleRoadBlocked(85, 16, 1.25)).toBe(true);
    expect(vehicleRoadBlocked(32, 32, 1.25)).toBe(true);
  });

  it("expands apartment terrace across all 4 Lagos tiers, exposes garage & gender palettes", () => {
    expect(HOUSES).toHaveLength(4);
    expect(TERRACE_BOUNDS(0).width).toBeLessThan(TERRACE_BOUNDS(1).width);
    expect(TERRACE_BOUNDS(1).width).toBeLessThan(TERRACE_BOUNDS(2).width);
    expect(TERRACE_BOUNDS(2).width).toBeLessThan(TERRACE_BOUNDS(3).width);
    expect(insideTerrace(8.5, -2.5, 0)).toBe(true);
    expect(insideGarage(9.5, 4.0)).toBe(true);
    expect(apartmentBlocked(8.2, -1.3, 0.4, [], false, 0)).toBe(false); // Open sliding glass terrace door
    expect(apartmentBlocked(8.2, 4.2, 0.4, [], false, 0)).toBe(false); // Open garage doorway
    expect(resolveApartmentPalette("female", "pinterest").accentWall).toBe("#f4dce3");
    expect(resolveApartmentPalette("male", "pinterest").accentWall).toBe("#dce7f2");
  });

  it("upgrades house up to Banana Island Penthouse and ride step-by-step via confirmation", () => {
    useGame.getState().patch({ money: 600_000 });
    requestHouseUpgrade(1);
    expect(useGame.getState().house).toBe(0);
    expect(useGame.getState().money).toBe(600_000);
    confirmPendingPurchase();
    expect(useGame.getState().house).toBe(1);

    requestHouseUpgrade(2);
    confirmPendingPurchase();
    expect(useGame.getState().house).toBe(2);

    requestHouseUpgrade(3);
    confirmPendingPurchase();
    expect(useGame.getState().house).toBe(3);

    requestRideUpgrade(1);
    expect(useGame.getState().rideTier).toBe(0);
    confirmPendingPurchase();
    expect(useGame.getState().rideTier).toBe(1);
    const ride = useGame.getState().vehicles[0];
    expect(ride?.kind).toBe("bike");
    expect(onAsphaltRoad(ride!.x, ride!.z, 0.65)).toBe(true);
  });

  it("runs 10s police arrest fine option and 5-minute 3D jail cell lockup", () => {
    useGame.getState().patch({ wanted: 2, money: 30_000 });
    triggerPoliceCatch();
    expect(useGame.getState().arrestStage?.kind).toBe("prompt");

    payArrestFine();
    expect(useGame.getState().money).toBe(30_000 - POLICE_FINE);
    expect(useGame.getState().arrestStage).toBeNull();
    expect(useGame.getState().wanted).toBe(0);

    useGame.getState().patch({ wanted: 2, money: 5_000 });
    triggerPoliceCatch();
    startPoliceEscort();
    expect(useGame.getState().arrestStage?.kind).toBe("escort");

    lockInPoliceJailCell();
    expect(useGame.getState().inside).toBe(true);
    expect(useGame.getState().interior).toBe("police");
    expect(useGame.getState().jailUntil).toBeGreaterThan(Date.now());
    expect(insidePoliceCell(rt.player.x, rt.player.z)).toBe(true);
    // Barred cell door blocks exit while locked
    expect(interiorBlocked("police", 2.6, -1.9, 0.4, true)).toBe(true);
    expect(interiorBlocked("police", 2.6, -1.9, 0.4, false)).toBe(false);
  });
});

afterEach(() => vi.unstubAllGlobals());
