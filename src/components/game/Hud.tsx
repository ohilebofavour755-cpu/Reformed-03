import { useEffect, useRef, useState } from "react";
import { Home, Paintbrush, Volume2, VolumeX, Save, Sun, Moon, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, saveNow } from "@/game/store";
import { rt } from "@/game/runtime";
import { rankName, naira } from "@/game/rules";
import { LANDMARK_TITLE, landmarkCenter } from "@/game/world";
import { STATIONS } from "@/game/sim/apartment";
import { placeActions, npcActions } from "@/game/actions";
import { homeActs, enterApartment, vehicleActs } from "@/game/life";
import { MiniMap } from "./Map";
import { GameDialogs } from "./GameDialogs";

function Joystick() {
  const base = useRef<HTMLDivElement>(null), pointer = useRef<number | null>(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    if (!base.current || pointer.current !== e.pointerId) return;
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = -(e.clientY - r.top - r.height / 2) / (r.height / 2);
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    rt.input.x = x; rt.input.y = y; setK({ x, y });
  };
  const end = () => { pointer.current = null; rt.input.x = 0; rt.input.y = 0; setK({ x: 0, y: 0 }); };
  return <div ref={base} role="group" aria-label="Movement joystick" className="pointer-events-auto absolute bottom-8 left-5 h-28 w-28 touch-none rounded-full border border-border bg-card/50 backdrop-blur"
    onPointerDown={(e) => { e.stopPropagation(); pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
    onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-primary/80" style={{ transform: `translate(calc(-50% + ${k.x * 34}px), calc(-50% + ${-k.y * 34}px))` }} />
  </div>;
}
const Bar = ({ label, v, title }: { label: string; v: number; title: string }) => <div title={title} className="flex items-center gap-1 text-[10px]"><span>{label}</span><div role="meter" aria-label={title} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-12 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div></div>;
export function Hud() {
  const s = useGame(), [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 400); return () => clearInterval(id); }, []);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!s.toast) return; setToast(s.toast.text); const id = setTimeout(() => setToast(null), 7000); return () => clearTimeout(id); }, [s.toast]);
  const jail = s.jailUntil - Date.now(), vehicles = vehicleActs();
  const canEnter = !s.inside && Math.hypot(rt.player.x, rt.player.z - 11.5) < 3 && !rt.driving;
  const acts = s.inside ? homeActs(s.station) : rt.driving ? vehicles : [...vehicles, ...(canEnter ? [{ label: "🚪 Enter your apartment", run: enterApartment, disabled: s.wanted > 0 }] : []), ...(s.near ? npcActions() : placeActions(s.place))];
  const hh = Math.floor(s.time), mm = Math.floor((s.time % 1) * 60), day = s.time > 6 && s.time < 19;
  const goal = s.waypoint ? landmarkCenter(s.waypoint) : null;
  const bearing = goal ? Math.atan2(goal.x - rt.player.x, -(goal.z + 12 - rt.player.z)) + rt.camYaw : 0;
  return <div className="pointer-events-none absolute inset-0 font-display text-foreground">
    <div className="hud-panel pointer-events-auto absolute left-3 top-3 max-w-[52%] p-2.5 text-xs">
      <p className="break-words font-bold">{s.profile?.name} · {rankName(s.xp)} {s.partner ? "💍" : ""} {s.wanted ? "⭐".repeat(s.wanted) : ""}</p>
      <p className="text-lg font-extrabold text-primary">{naira(s.money)}</p>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1"><Bar label="🍛" title="Hunger" v={s.hunger} /><Bar label="⚡" title="Energy" v={s.energy} /><Bar label="🚽" title="Bladder" v={100 - s.bladder} /><Bar label="🎉" title="Fun" v={s.fun} /></div>
      <p className="mt-1.5 text-[9px] text-muted-foreground" role="status">{s.saveError ? "Save unavailable — check browser storage" : s.lastSaved ? "Progress saved" : "Autosave on"}</p>
    </div>
    <div className="pointer-events-auto absolute right-3 top-3 flex gap-1">
      <Button variant="game" size="icon" title={s.inside ? "Decorate room" : "Find home"} aria-label={s.inside ? "Decorate room" : "Find home"} onClick={() => s.patch(s.inside ? { dialog: "decorate" } : { waypoint: "home" })}>{s.inside ? <Paintbrush /> : <Home />}</Button>
      <Button variant="game" size="icon" title="Save progress" aria-label="Save progress" onClick={saveNow}><Save /></Button>
      <Button variant="game" size="icon" title={s.muted ? "Unmute" : "Mute"} aria-label={s.muted ? "Unmute" : "Mute"} onClick={() => s.patch({ muted: !s.muted })}>{s.muted ? <VolumeX /> : <Volume2 />}</Button>
    </div>
    <MiniMap />
    <div className="absolute bottom-40 left-5 flex items-center gap-1 text-xs">{day ? <Sun size={14} /> : <Moon size={14} />}{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</div>
    {goal && !s.inside && <div className="hud-panel absolute left-5 top-36 flex items-center gap-2 px-2 py-1 text-xs"><Navigation size={16} style={{ transform: `rotate(${bearing}rad)` }} />{Math.round(Math.hypot(goal.x - rt.player.x, goal.z + 12 - rt.player.z))} m</div>}
    {toast && <div role="status" className="hud-panel absolute inset-x-4 top-[38%] mx-auto max-w-md whitespace-pre-line p-3 text-center text-sm">{toast}</div>}
    {s.busy && <div className="hud-panel absolute left-1/2 top-1/2 max-w-[80%] -translate-x-1/2 px-4 py-2 text-sm">{s.busy.label}</div>}
    {jail > 0 && <div className="absolute inset-x-0 top-1/3 text-center"><div className="hud-panel mx-auto inline-block p-4"><p className="text-lg font-bold">In police custody</p><p className="text-3xl font-extrabold text-primary">{Math.floor(jail / 60000)}:{String(Math.floor((jail % 60000) / 1000)).padStart(2, "0")}</p></div></div>}
    <div className="pointer-events-auto absolute bottom-8 right-3 flex max-h-[42dvh] w-[52%] max-w-xs flex-col items-end gap-1.5 overflow-y-auto">
      <p className="hud-panel max-w-full px-2 py-1 text-right text-xs font-bold">{rt.driving ? `${Math.round(Math.abs(rt.vehicleSpeed) * 3.6)} km/h` : s.inside ? STATIONS.find((f) => f.id === s.station)?.title ?? "Your apartment" : s.near ? `${s.near.name}${s.near.isPartner ? " 💍" : ""}` : s.place ? LANDMARK_TITLE[s.place] : "Reformed City"}</p>
      {jail <= 0 && acts.map((a) => <Button key={a.label} variant="game" className="h-auto min-h-10 max-w-full justify-start whitespace-normal px-3 py-2 text-left text-xs" disabled={a.disabled || !!s.busy || !!s.dialog} onClick={a.run}>{a.label}</Button>)}
    </div>
    <Joystick />
    <GameDialogs />
  </div>;
}
