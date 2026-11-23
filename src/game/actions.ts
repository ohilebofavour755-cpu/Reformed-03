import { useGame, type GameState } from "./store";
import { rt } from "./runtime";
import { PRICES, HOUSES, clamp, naira, remoteEarnings, warmChance, flirtChance } from "./rules";
import { say, LINES, pickLine } from "./voice";
import { fx } from "./audio";
import { pushNpc } from "./npcs";
import type { Landmark } from "./world";

export interface Act { label: string; run: () => void; disabled?: boolean }
const g = () => useGame.getState();

export function busy(label: string, ms: number, done: () => void, act: null | "dance" | "sit" = null) {
  if (g().busy) return;
  const now = Date.now();
  rt.player.act = act;
  g().patch({ busy: { label, start: now, end: now + ms } });
  setTimeout(() => { rt.player.act = null; g().patch({ busy: null }); done(); }, ms);
}
function pay(cost: number): boolean {
  if (g().money < cost) { g().notify("💸 Not enough money. Work remotely to earn more!"); return false; }
  g().patch({ money: g().money - cost });
  fx.pop();
  return true;
}
const add = (k: "hunger" | "energy" | "bladder" | "fun", v: number) => g().patch({ [k]: clamp(g()[k] + v) } as Partial<GameState>);

export const workAction = (): Act => ({
  label: `💻 Work remotely (+${naira(remoteEarnings(g().xp))})`,
  disabled: g().energy < 10,
  run: () => busy("Working remotely…", 6000, () => {
    const earn = remoteEarnings(g().xp);
    g().patch({ money: g().money + earn }); add("energy", -18); add("fun", -8); g().addXp(20); fx.cash();
    g().notify(`💰 You earned ${naira(earn)}!`);
  }),
});
export const eatAction = (): Act => ({
  label: `🍛 Eat jollof (${g().meals})`,
  disabled: g().meals < 1,
  run: () => busy("Eating jollof rice…", 3000, () => { g().patch({ meals: g().meals - 1 }); add("hunger", 55); add("fun", 8); g().notify("😋 That jollof was sweet!"); }),
});

export function placeActions(place: Landmark | null): Act[] {
  const s = g();
  switch (place) {
    case "home": return [
      { label: "🏠 Your apartment", disabled: true, run: () => {} },
    ];
    case "market": return [
      { label: `🥬 Buy groceries ${naira(PRICES.ingredients)}`, run: () => { if (pay(PRICES.ingredients)) { g().patch({ groceries: g().groceries + 1 }); g().notify("Groceries bought. Take them home to your fridge."); } } },
      { label: `🍩 Puff-puff ${naira(PRICES.puffpuff)}`, run: () => { if (pay(PRICES.puffpuff)) { add("hunger", 20); g().notify("🍩 Hot puff-puff!"); } } },
      { label: `🍢 Suya ${naira(PRICES.suya)}`, run: () => { if (pay(PRICES.suya)) { add("hunger", 35); add("fun", 5); g().notify("🔥 Suya with pepper. Enjoy!"); } } },
    ];
    case "boutique": return [{ label: "👗 Clothes & hair salon", run: () => g().patch({ dialog: "boutique" }) }];
    case "dealer": return [{ label: "🚘 Browse cars & bikes", run: () => g().patch({ dialog: "dealer" }) }];
    case "realtor": {
      const nx = HOUSES[s.house + 1];
      return [nx
        ? { label: `🔑 Buy ${nx.name} ${naira(nx.price)}`, run: () => { if (pay(nx.price)) { g().patch({ house: g().house + 1 }); g().addXp(150); g().notify(`🏡 You now own a ${nx.name}! Respect up.`); } } }
        : { label: "🏆 You own the best house", disabled: true, run: () => {} }];
    }
    case "school": return [{ label: `📚 Attend class ${naira(PRICES.school)}`, run: () => { if (pay(PRICES.school)) busy("In class, learning…", 6000, () => { g().addXp(45); add("energy", -10); g().notify("🎓 You learned a lot. +45 XP"); }); } }];
    case "church": return [{ label: `🙏 Attend service (offering ${naira(PRICES.offering)})`, run: () => { if (pay(PRICES.offering)) busy("Praising in church…", 5000, () => { g().addXp(30); add("fun", 15); g().notify("⛪ Blessed! +30 XP"); }, "dance"); } }];
    case "club": return [
      { label: `💃 Dance ${naira(PRICES.dance)}`, run: () => { if (pay(PRICES.dance)) busy("Dancing amapiano…", 6000, () => { add("fun", 30); add("energy", -10); g().addXp(8); }, "dance"); } },
      { label: `🍹 Drink ${naira(PRICES.drink)}`, run: () => { if (pay(PRICES.drink)) { add("fun", 12); g().notify("🍹 Chapman, cold one!"); } } },
    ];
    case "chill": return [
      { label: "🌴 Relax on lounger", run: () => busy("Chilling by the beach…", 5000, () => { add("fun", 25); add("energy", 10); }, "sit") },
      { label: `🚻 Public toilet ${naira(PRICES.toilet)}`, run: () => { if (pay(PRICES.toilet)) { g().patch({ bladder: 0 }); g().notify("😌 Relief!"); } } },
    ];
    default: return [];
  }
}

export function npcActions(): Act[] {
  const s = g(), near = s.near;
  if (!near) return [];
  const n = rt.npcs[near.id];
  if (!n) return [];
  const me = s.profile?.gender ?? "male";
  const talk = (mine: string, theirs: string) => {
    g().notify(`You: “${mine}”\n${n.name}: “${theirs}”`);
    say(mine, me, s.muted); say(theirs, n.gender, s.muted);
    n.heading = Math.atan2(rt.player.x - n.x, rt.player.z - n.z);
    if (n.mode === "walk" || n.mode === "wander") { n.mode = "idle"; n.timer = 3; }
  };
  const aff = s.affection[String(n.id)] ?? 0;
  if (near.isPartner) return [
    { label: "❤️ Sweet talk", run: () => { talk("I love you, my darling.", pickLine(LINES.partner)); g().patch({ fun: clamp(g().fun + 10) }); } },
    { label: "💔 File for divorce", run: () => g().patch({ dialog: "divorce" }) },
  ];
  const list: Act[] = [
    { label: "😊 Greet warmly", run: () => { const ok = Math.random() < warmChance(g().xp); talk(pickLine(LINES.warmMe), pickLine(ok ? LINES.warmThem : LINES.coldThem)); if (ok) { g().addXp(3); g().patch({ fun: clamp(g().fun + 5) }); } } },
    { label: "😤 Clapback", run: () => { talk(pickLine(LINES.clapMe), pickLine(LINES.clapThem)); g().patch({ fun: clamp(g().fun + 3) }); } },
    { label: `😏 Flirt (${aff}/3 ❤️)`, run: () => {
      const ok = Math.random() < flirtChance(g().xp);
      talk(pickLine(LINES.flirtMe), pickLine(ok ? LINES.flirtYes : LINES.flirtNo));
      if (ok) g().patch({ affection: { ...g().affection, [String(n.id)]: aff + 1 } });
    } },
  ];
  if (aff >= 3 && !s.partner) list.push({ label: "💍 Propose marriage", run: () => {
    if (Math.random() < 0.75) {
      talk("Will you marry me?", "Yes! Yes! I will marry you!");
      n.base = "follow"; n.mode = "follow";
      g().patch({ partner: { id: n.id, name: n.name } }); g().addXp(60);
      setTimeout(() => g().notify(`💍 You and ${n.name} are now married! They will follow you everywhere.`), 2500);
    } else talk("Will you marry me?", "Ehn… I'm not ready yet. Ask me again.");
  } });
  list.push({ label: "🫸 Push", run: () => {
    const h = Math.atan2(n.x - rt.player.x, n.z - rt.player.z);
    const line = pickLine(LINES.pushThem);
    pushNpc(n, h); say(line, n.gender, s.muted);
    g().notify(`${n.name}: “${line}”`);
  } });
  return list;
}
