import { useState } from "react";
import { X, Check, RotateCw, Trash2, Flower2, LampFloor, Gem, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, saveNow } from "@/game/store";
import { OUTFITS, ROOM_THEMES, SKIN_TONES, HAIR_COLORS, DECOR_CATALOG, type DecorKind } from "@/game/catalog";
import { apartmentBlocked } from "@/game/sim/apartment";
import { VEHICLE_CATALOG } from "@/game/sim/mobility";
import { purchaseVehicle, confirmDivorce } from "@/game/life";
import { naira } from "@/game/rules";
import { LANDMARK_TITLE, type Landmark } from "@/game/world";
import { rt } from "@/game/runtime";
import { MapCanvas } from "./Map";

function Wardrobe() {
  const s = useGame(), profile = s.profile;
  if (!profile) return null;
  const apply = (p: Partial<typeof profile.look>) => { s.patch({ profile: { ...profile, look: { ...profile.look, ...p } } }); saveNow(); };
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-2">{OUTFITS.map((o) => {
      const owned = s.wardrobe.includes(o.id), active = profile.look.shirt === o.shirt && profile.look.pants === o.pants;
      return <Button key={o.id} variant={active ? "default" : "game"} className="h-auto justify-start whitespace-normal p-3 text-left" disabled={!owned && s.dialog !== "boutique"} onClick={() => {
        if (!owned) {
          if (s.money < o.price) return s.notify("Not enough money.");
          s.patch({ money: s.money - o.price, wardrobe: [...s.wardrobe, o.id] });
        }
        apply({ shirt: o.shirt, pants: o.pants });
      }}>
        <span className="flex shrink-0 gap-0.5"><span className="h-8 w-3 rounded-sm" style={{ backgroundColor: o.shirt }} /><span className="h-8 w-3 rounded-sm" style={{ backgroundColor: o.pants }} /></span>
        <span className="text-xs">{o.name}<span className="mt-1 block opacity-70">{owned ? active ? "Wearing" : "Owned" : naira(o.price)}</span></span>{active && <Check className="ml-auto" />}
      </Button>;
    })}</div>
    <div><p className="mb-2 text-sm font-bold">Skin tone</p><div className="flex flex-wrap gap-2">{SKIN_TONES.map((c, i) => <Button key={c} aria-label={`Skin tone ${i + 1}`} title={`Skin tone ${i + 1}`} variant="outline" size="icon" className="rounded-full border-2" style={{ backgroundColor: c }} onClick={() => apply({ skin: c })}>{profile.look.skin === c && <Check />}</Button>)}</div></div>
    <div><p className="mb-2 text-sm font-bold">Hair colour</p><div className="flex gap-2">{HAIR_COLORS.map((c, i) => <Button key={c} aria-label={`Hair colour ${i + 1}`} title={`Hair colour ${i + 1}`} variant="outline" size="icon" className="rounded-full" style={{ backgroundColor: c }} onClick={() => apply({ hair: c })} />)}</div></div>
    <div className="flex flex-wrap gap-2">{["Short", "Afro", "Long", "Bun", "Bald"].map((n, i) => <Button key={n} size="sm" variant={profile.look.hairStyle === i ? "default" : "game"} onClick={() => apply({ hairStyle: i })}>{n}</Button>)}</div>
  </div>;
}
function Decoration() {
  const s = useGame();
  const [kind, setKind] = useState<DecorKind>("plant"), [selected, setSelected] = useState<string | null>(null);
  const selectedItem = s.decor.find((d) => d.id === selected);
  const symbol = (k: DecorKind) => k === "plant" ? "🌿" : k === "lamp" ? "💡" : "◆";
  return <div className="space-y-4">
    <div className="flex gap-2">{ROOM_THEMES.map((theme) => <Button key={theme.id} className="h-auto flex-1 flex-col whitespace-normal p-2 text-xs" variant={s.roomTheme === theme.id ? "default" : "game"} onClick={() => { s.patch({ roomTheme: theme.id }); saveNow(); }}><span className="h-5 w-full rounded-sm" style={{ backgroundColor: theme.sofa }} />{theme.name}</Button>)}</div>
    <div className="grid grid-cols-3 gap-2">{DECOR_CATALOG.map((item) => <Button key={item.kind} className="h-auto flex-col whitespace-normal p-2 text-xs" variant={kind === item.kind && !selected ? "default" : "game"} onClick={() => { setKind(item.kind); setSelected(null); }}>{item.kind === "plant" ? <Flower2 /> : item.kind === "lamp" ? <LampFloor /> : <Gem />}{item.name}<span>{naira(item.price)}</span></Button>)}</div>
    <div className="decor-grid" aria-label="Room decoration layout">{Array.from({ length: 99 }, (_, i) => {
      const x = i % 11 - 5, z = Math.floor(i / 11) - 4;
      const item = s.decor.find((d) => Math.round(d.x) === x && Math.round(d.z) === z);
      const blocked = apartmentBlocked(x, z, 0.45) || Math.hypot(x - rt.player.x, z - rt.player.z) < 1;
      return <Button key={i} className="decor-cell" variant={item?.id === selected ? "default" : "game"} aria-label={`Room spot ${x}, ${z}${item ? `, ${item.kind}` : ""}`} disabled={blocked && !item} onClick={() => {
        if (item) { setSelected(item.id); return; }
        if (selectedItem) { s.patch({ decor: s.decor.map((d) => d.id === selected ? { ...d, x, z } : d) }); saveNow(); return; }
        const price = DECOR_CATALOG.find((d) => d.kind === kind)?.price ?? 0;
        if (s.money < price) return s.notify("Not enough money.");
        const id = crypto.randomUUID();
        s.patch({ money: s.money - price, decor: [...s.decor, { id, kind, x, z, rotation: 0 }] }); setSelected(id); saveNow();
      }}>{item ? symbol(item.kind) : blocked ? "▪" : ""}</Button>;
    })}</div>
    {selectedItem && <div className="flex items-center gap-2"><p className="mr-auto text-sm capitalize">{selectedItem.kind}</p><Button variant="game" size="icon" aria-label="Rotate decoration" title="Rotate" onClick={() => { s.patch({ decor: s.decor.map((d) => d.id === selected ? { ...d, rotation: d.rotation + Math.PI / 2 } : d) }); saveNow(); }}><RotateCw /></Button><Button variant="destructive" size="icon" aria-label="Remove decoration" title="Remove" onClick={() => { s.patch({ decor: s.decor.filter((d) => d.id !== selected) }); setSelected(null); saveNow(); }}><Trash2 /></Button></div>}
  </div>;
}
export function GameDialogs() {
  const s = useGame();
  if (!s.dialog) return null;
  const title = s.dialog === "home" ? "Your wardrobe" : s.dialog === "boutique" ? "Boutique & salon" : s.dialog === "decorate" ? "Your room" : s.dialog === "dealer" ? "City Motors" : s.dialog === "map" ? "Reformed City" : "Go your separate ways?";
  return <div className="game-modal" onPointerDown={(e) => e.stopPropagation()}>
    <section role="dialog" aria-modal="true" aria-label={title} className="game-dialog">
      <header className="mb-5 flex items-center justify-between gap-2"><h2>{title}</h2><Button variant="ghost" size="icon" aria-label="Close dialog" title="Close" onClick={() => { s.patch({ dialog: null }); saveNow(); }}><X /></Button></header>
      {(s.dialog === "home" || s.dialog === "boutique") && <Wardrobe />}
      {s.dialog === "decorate" && <Decoration />}
      {s.dialog === "dealer" && <div className="space-y-3">{VEHICLE_CATALOG.map((v) => {
        const owned = s.vehicles.some((o) => o.kind === v.kind);
        return <div key={v.kind} className="flex items-center justify-between gap-4 border-b border-border py-4"><div><p className="text-2xl">{v.kind === "car" ? "🚘" : "🚲"}</p><p className="font-bold">{v.name}</p><p className="text-sm text-muted-foreground">{naira(v.price)}</p></div><Button disabled={owned || s.money < v.price} onClick={() => purchaseVehicle(v.kind)}><ShoppingBag />{owned ? "Owned" : "Buy"}</Button></div>;
      })}</div>}
      {s.dialog === "divorce" && <div className="space-y-5"><p className="text-sm text-muted-foreground">End your marriage to {s.partner?.name}? You'll both be single again.</p><div className="flex gap-2"><Button variant="game" className="flex-1" onClick={() => s.patch({ dialog: null })}>Stay together</Button><Button variant="destructive" className="flex-1" onClick={confirmDivorce}>Confirm divorce</Button></div></div>}
      {s.dialog === "map" && <div className="space-y-4"><MapCanvas large /><div className="grid grid-cols-2 gap-2">{(Object.keys(LANDMARK_TITLE) as Landmark[]).map((l) => <Button key={l} variant={s.waypoint === l ? "default" : "game"} className="h-auto justify-start whitespace-normal p-2 text-left text-xs" onClick={() => s.patch({ waypoint: l, dialog: null })}>{LANDMARK_TITLE[l]}</Button>)}</div>{s.waypoint && <Button variant="ghost" className="w-full" onClick={() => s.patch({ waypoint: null, dialog: null })}>Clear destination</Button>}</div>}
    </section>
  </div>;
}