import { useGame, saveNow, type GameState, type PendingPurchase } from "./store";
import { rt, type PlayerAct } from "./runtime";
import {
  PRICES,
  POLICE_FINE,
  JAIL_MS,
  ARREST_COUNTDOWN_MS,
  clamp,
  naira,
  remoteEarnings,
  warmChance,
  flirtChance,
} from "./rules";
import { say, LINES, pickLine } from "./voice";
import { fx } from "./audio";
import { pushNpc, holdPolice, clearPolice, createInteriorNpcs } from "./npcs";
import { POLICE_CELL } from "./sim/interiors";
import {
  insidePublicRestroom,
  isNearClubBar,
  isOnDanceFloor,
  nearestCitySeat,
  PUBLIC_RESTROOM,
  type Landmark,
} from "./world";

export interface Act {
  label: string;
  run: () => void;
  disabled?: boolean;
}
const g = () => useGame.getState();

export function requestPurchase(req: PendingPurchase) {
  g().patch({ pendingPurchase: req });
}

export function confirmPendingPurchase() {
  const s = g();
  const req = s.pendingPurchase;
  if (!req) return;
  if (s.money < req.price) {
    s.notify("💸 Not enough money. Work remotely to earn more!");
    s.patch({ pendingPurchase: null });
    return;
  }
  s.patch({ money: s.money - req.price, pendingPurchase: null });
  fx.pop();
  req.onConfirm();
  saveNow();
}

export function cancelPendingPurchase() {
  const s = g();
  const req = s.pendingPurchase;
  s.patch({ pendingPurchase: null });
  req?.onCancel?.();
}

export function seatPlayer(
  x: number,
  z: number,
  heading: number,
  sitY = 0.02,
  exitX?: number,
  exitZ?: number,
  act: PlayerAct = "sit",
) {
  rt.player.exitPos = { x: exitX ?? rt.player.x, z: exitZ ?? rt.player.z };
  rt.player.x = x;
  rt.player.z = z;
  rt.player.heading = heading;
  rt.player.speed = 0;
  rt.player.sitY = sitY;
  rt.player.act = act;
}

export function standUp() {
  if (rt.player.exitPos) {
    rt.player.x = rt.player.exitPos.x;
    rt.player.z = rt.player.exitPos.z;
  }
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.exitPos = null;
}

export function stopDancing() {
  if (rt.player.act === "dance") rt.player.act = null;
}

export function busy(label: string, ms: number, done: () => void, act: PlayerAct = null) {
  if (g().busy) return;
  const now = Date.now();
  rt.player.act = act;
  g().patch({ busy: { label, start: now, end: now + ms } });
  setTimeout(() => {
    rt.player.act = null;
    rt.player.sitY = 0;
    g().patch({ busy: null });
    done();
  }, ms);
}

export const addStat = (k: "hunger" | "energy" | "bladder" | "fun", v: number) =>
  g().patch({ [k]: clamp(g()[k] + v) } as Partial<GameState>);

export const workAction = (onSeat?: () => void): Act => ({
  label: `💻 Work remotely (+${naira(remoteEarnings(g().xp))})`,
  disabled: g().energy < 10,
  run: () => {
    onSeat?.();
    busy(
      "Working remotely…",
      6000,
      () => {
        const earn = remoteEarnings(g().xp);
        g().patch({ money: g().money + earn });
        addStat("energy", -18);
        addStat("fun", -8);
        g().addXp(20);
        fx.cash();
        standUp();
        g().notify(`💰 You earned ${naira(earn)}!`);
      },
      "sit",
    );
  },
});

export const eatAction = (onSeat?: () => void): Act => ({
  label: `🍛 Eat jollof (${g().meals})`,
  disabled: g().meals < 1,
  run: () => {
    onSeat?.();
    busy(
      "Eating jollof rice…",
      3000,
      () => {
        g().patch({ meals: g().meals - 1 });
        addStat("hunger", 55);
        addStat("fun", 8);
        standUp();
        g().notify("😋 That jollof was sweet!");
      },
      "sit",
    );
  },
});

export function requestDrinkPurchase() {
  requestPurchase({
    title: "Ice-Cold Chapman",
    preview: "🍹 Classic Nigerian Chapman from Amapiano Bar (+15 Fun)",
    price: PRICES.drink,
    onConfirm: () => {
      addStat("fun", 15);
      g().notify("🍹 Chapman, ice cold!");
    },
  });
}

export function triggerPoliceCatch() {
  const s = g();
  if (s.arrestStage || s.jailUntil > Date.now()) return;
  rt.driving = null;
  rt.vehicleSpeed = 0;
  rt.player.speed = 0;
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.exitPos = null;
  holdPolice(rt.npcs, rt.player.x, rt.player.z);
  fx.siren(true);
  s.patch({
    arrestStage: { kind: "prompt", expiresAt: Date.now() + ARREST_COUNTDOWN_MS },
    pendingPurchase: null,
    dialog: null,
  });
  s.notify(`🚓 Police caught you! Pay ${naira(POLICE_FINE)} within 10 seconds or go to jail!`);
}

export function payArrestFine() {
  const s = g();
  if (s.money < POLICE_FINE) {
    s.notify(`💸 Need ${naira(POLICE_FINE)} for the fine!`);
    return;
  }
  clearPolice(rt.npcs);
  fx.siren(false);
  fx.pop();
  s.patch({
    money: s.money - POLICE_FINE,
    wanted: 0,
    arrestStage: null,
  });
  saveNow();
  s.notify(`🚓 Paid ${naira(POLICE_FINE)} fine. You are released!`);
}

export function startPoliceEscort() {
  const s = g();
  const now = Date.now();
  rt.driving = null;
  rt.vehicleSpeed = 0;
  rt.player.act = null;
  rt.player.sitY = 0;
  clearPolice(rt.npcs);
  fx.siren(true);
  s.patch({
    arrestStage: {
      kind: "escort",
      startX: rt.player.x,
      startZ: rt.player.z,
      startedAt: now,
      arriveAt: now + 3200,
    },
  });
  s.notify("🚓 Escorting you in a police patrol vehicle to the Police Station…");
}

export function lockInPoliceJailCell() {
  fx.siren(false);
  clearPolice(rt.npcs);
  rt.driving = null;
  rt.vehicleSpeed = 0;
  rt.player.act = null;
  rt.player.sitY = 0;
  rt.player.exitPos = null;
  rt.doorLocked = false;
  rt.interiorNpcs = createInteriorNpcs("police");
  Object.assign(rt.player, {
    x: POLICE_CELL.spawn.x,
    z: POLICE_CELL.spawn.z,
    y: 0,
    speed: 0,
    heading: POLICE_CELL.spawn.heading,
  });
  rt.camYaw = 0;
  rt.keys.clear();
  rt.input.x = 0;
  rt.input.y = 0;
  const s = g();
  s.patch({
    inside: true,
    interior: "police",
    place: "police",
    near: null,
    station: null,
    interiorStation: "cell",
    wanted: 0,
    arrestStage: null,
    jailUntil: Date.now() + JAIL_MS,
    dialog: null,
    tryOn: null,
    previewLook: null,
    pendingPurchase: null,
  });
  saveNow();
  s.notify("🔒 Locked behind bars in Police Jail Cell for 5 minutes!");
}

export function placeActions(place: Landmark | null): Act[] {
  const px = rt.player.x;
  const pz = rt.player.z;

  if (rt.player.act === "dance") {
    return [{ label: "🛑 Stop Dancing", run: stopDancing }];
  }
  if (rt.player.act === "sit") {
    const acts: Act[] = [{ label: "🧍 Stand Up", run: standUp }];
    if (place === "club" && isNearClubBar(px, pz)) {
      acts.unshift({
        label: `🍹 Buy Drink (Chapman ${naira(PRICES.drink)})`,
        run: requestDrinkPurchase,
      });
    }
    return acts;
  }

  // Enclosed Public Restroom interior check (never show toilet prompt outdoors)
  if (insidePublicRestroom(px, pz)) {
    return [
      {
        label: "🚽 Use Toilet",
        run: () => {
          rt.doorLocked = true;
          seatPlayer(
            PUBLIC_RESTROOM.x - 1.8,
            PUBLIC_RESTROOM.z - 0.55,
            0,
            0.02,
            PUBLIC_RESTROOM.x,
            PUBLIC_RESTROOM.z + 1.0,
            "sit",
          );
          busy(
            "Using restroom…",
            2800,
            () => {
              g().patch({ bladder: 0 });
              rt.doorLocked = false;
              standUp();
              g().notify("😌 Relief! Door unlocked.");
            },
            "sit",
          );
        },
      },
    ];
  }

  // Club check preserved for inside/unit-test parity; outdoors walls block entry until entering door
  if (place === "club") {
    const clubActs: Act[] = [];
    if (isNearClubBar(px, pz)) {
      clubActs.push({
        label: `🍹 Buy Drink (Chapman ${naira(PRICES.drink)})`,
        run: requestDrinkPurchase,
      });
    } else if (isOnDanceFloor(px, pz)) {
      clubActs.push({
        label: "💃 Dance",
        run: () => {
          rt.player.act = "dance";
        },
      });
    }
    if (clubActs.length > 0) return clubActs;
  }

  // Outdoor seating only (loungers / shaded benches) — NO outside sidewalk purchase popups!
  const nearSeat = nearestCitySeat(px, pz);
  if (nearSeat) {
    return [
      {
        label: nearSeat.label,
        run: () =>
          seatPlayer(
            nearSeat.x,
            nearSeat.z,
            nearSeat.heading,
            nearSeat.sitY,
            nearSeat.exitX,
            nearSeat.exitZ,
            "sit",
          ),
      },
    ];
  }

  return [];
}

export function npcActions(): Act[] {
  const s = g();
  const near = s.near;
  if (!near) return [];
  const pool = s.inside ? rt.interiorNpcs : rt.npcs;
  const n = pool.find((npc) => npc.id === near.id);
  if (!n) return [];
  const me = s.profile?.gender ?? "male";
  const talk = (mine: string, theirs: string) => {
    g().notify(`You: “${mine}”\n${n.name}: “${theirs}”`);
    say(mine, me, s.muted, (ms) => {
      rt.player.talkUntil = Date.now() + ms;
    });
    say(theirs, n.gender, s.muted, (ms) => {
      n.talkUntil = Date.now() + ms;
    });
    n.heading = Math.atan2(rt.player.x - n.x, rt.player.z - n.z);
    if (n.mode === "walk" || n.mode === "wander") {
      n.mode = "idle";
      n.timer = 3;
    }
  };

  if (n.role === "bartender") {
    return [
      {
        label: `🍹 Buy Drink (Chapman ${naira(PRICES.drink)})`,
        run: requestDrinkPurchase,
      },
      {
        label: "😊 Greet warmly",
        run: () => {
          talk(pickLine(LINES.warmMe), pickLine(LINES.warmThem));
          g().addXp(2);
        },
      },
    ];
  }

  if (n.role === "staff" || n.role === "roadsafety") {
    return [
      {
        label: "😊 Greet warmly",
        run: () => {
          talk(pickLine(LINES.warmMe), pickLine(LINES.warmThem));
          g().addXp(2);
        },
      },
    ];
  }

  if (near.isPartner)
    return [
      {
        label: "❤️ Sweet talk",
        run: () => {
          talk("I love you, my darling.", pickLine(LINES.partner));
          g().patch({ fun: clamp(g().fun + 10) });
        },
      },
      { label: "💔 File for divorce", run: () => g().patch({ dialog: "divorce" }) },
    ];

  const aff = s.affection[String(n.id)] ?? 0;
  const list: Act[] = [
    {
      label: "😊 Greet warmly",
      run: () => {
        const ok = Math.random() < warmChance(g().xp);
        talk(pickLine(LINES.warmMe), pickLine(ok ? LINES.warmThem : LINES.coldThem));
        if (ok) {
          g().addXp(3);
          g().patch({ fun: clamp(g().fun + 5) });
        }
      },
    },
    {
      label: "😤 Clapback",
      run: () => {
        talk(pickLine(LINES.clapMe), pickLine(LINES.clapThem));
        g().patch({ fun: clamp(g().fun + 3) });
      },
    },
    {
      label: `😏 Flirt (${aff}/3 ❤️)`,
      run: () => {
        const ok = Math.random() < flirtChance(g().xp);
        talk(pickLine(LINES.flirtMe), pickLine(ok ? LINES.flirtYes : LINES.flirtNo));
        if (ok) g().patch({ affection: { ...g().affection, [String(n.id)]: aff + 1 } });
      },
    },
  ];
  if (!near.isInterior && aff >= 3 && !s.partner)
    list.push({
      label: "💍 Propose marriage",
      run: () => {
        if (Math.random() < 0.75) {
          talk("Will you marry me?", "Yes! Yes! I will marry you!");
          n.base = "follow";
          n.mode = "follow";
          g().patch({ partner: { id: n.id, name: n.name } });
          g().addXp(60);
          setTimeout(
            () =>
              g().notify(`💍 You and ${n.name} are now married! They will follow you everywhere.`),
            2500,
          );
        } else talk("Will you marry me?", "Ehn… I'm not ready yet. Ask me again.");
      },
    });
  if (!near.isInterior) {
    list.push({
      label: "🫸 Push",
      run: () => {
        const h = Math.atan2(n.x - rt.player.x, n.z - rt.player.z);
        const line = pickLine(LINES.pushThem);
        pushNpc(n, h);
        say(line, n.gender, s.muted, (ms) => {
          n.talkUntil = Date.now() + ms;
        });
        g().notify(`${n.name}: “${line}”`);
      },
    });
  }
  return list;
}
