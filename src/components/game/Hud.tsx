import { useEffect, useRef, useState } from "react";
import {
  Home,
  Paintbrush,
  Volume2,
  VolumeX,
  Save,
  Sun,
  Moon,
  Navigation,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, saveNow } from "@/game/store";
import { rt } from "@/game/runtime";
import { rankName, naira, POLICE_FINE } from "@/game/rules";
import {
  LANDMARK_TITLE,
  BUILDING_DOORS,
  nearBuildingDoor,
  landmarkCenter,
  insidePublicRestroom,
} from "@/game/world";
import { STATIONS, insideHomeBathroom } from "@/game/sim/apartment";
import { INTERIORS } from "@/game/sim/interiors";
import { placeActions, npcActions, payArrestFine, startPoliceEscort } from "@/game/actions";
import { homeActs, interiorActs, enterBuilding, vehicleActs } from "@/game/life";
import { setVoiceMuted } from "@/game/voice";
import { MiniMap } from "./Map";
import { GameDialogs } from "./GameDialogs";

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    if (!base.current || pointer.current !== e.pointerId) return;
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = -(e.clientY - r.top - r.height / 2) / (r.height / 2);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    rt.input.x = x;
    rt.input.y = y;
    setK({ x, y });
  };
  const end = () => {
    pointer.current = null;
    rt.input.x = 0;
    rt.input.y = 0;
    setK({ x: 0, y: 0 });
  };
  return (
    <div
      ref={base}
      role="group"
      aria-label="Movement joystick"
      className="pointer-events-auto absolute bottom-8 left-5 h-28 w-28 touch-none rounded-full border border-border bg-card/50 backdrop-blur"
      onPointerDown={(e) => {
        e.stopPropagation();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-primary/80"
        style={{ transform: `translate(calc(-50% + ${k.x * 34}px), calc(-50% + ${-k.y * 34}px))` }}
      />
    </div>
  );
}

const Bar = ({ label, v, title }: { label: string; v: number; title: string }) => (
  <div title={title} className="flex items-center gap-1 text-[10px]">
    <span>{label}</span>
    <div
      role="meter"
      aria-label={title}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-12 overflow-hidden rounded bg-muted"
    >
      <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  </div>
);

export function Hud() {
  const s = useGame();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 300);
    return () => clearInterval(id);
  }, []);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!s.toast) return;
    setToast(s.toast.text);
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [s.toast]);

  const jail = s.jailUntil - Date.now();
  const activeInterior = s.inside ? (s.interior ?? "home") : null;
  const vehicles = vehicleActs();
  const doorKind = !s.inside && !rt.driving ? nearBuildingDoor(rt.player.x, rt.player.z) : null;

  const acts = activeInterior
    ? activeInterior === "home"
      ? homeActs(s.station)
      : [...interiorActs(activeInterior, s.interiorStation), ...(s.near ? npcActions() : [])]
    : rt.driving
      ? vehicles
      : [
          ...vehicles,
          ...(doorKind
            ? [
                {
                  label: `🚪 Enter ${BUILDING_DOORS[doorKind].label}`,
                  run: () => enterBuilding(doorKind),
                  disabled: doorKind === "home" && s.wanted > 0,
                },
              ]
            : []),
          ...(s.near ? npcActions() : placeActions(s.place)),
        ];

  const hh = Math.floor(s.time);
  const mm = Math.floor((s.time % 1) * 60);
  const day = s.time > 6 && s.time < 19;
  const goal = s.waypoint ? landmarkCenter(s.waypoint) : null;
  const bearing = goal
    ? Math.atan2(goal.x - rt.player.x, -(goal.z + 12 - rt.player.z)) + rt.camYaw
    : 0;

  const locationTitle = rt.driving
    ? `${Math.round(Math.abs(rt.vehicleSpeed) * 3.6)} km/h`
    : activeInterior
      ? activeInterior === "home"
        ? insideHomeBathroom(rt.player.x, rt.player.z)
          ? "🚿 Private Bathroom"
          : (STATIONS.find((f) => f.id === s.station)?.title ?? "Your apartment")
        : (INTERIORS[activeInterior].stations.find((st) => st.id === s.interiorStation)?.title ??
          INTERIORS[activeInterior].title)
      : insidePublicRestroom(rt.player.x, rt.player.z)
        ? "🚻 Public Restroom"
        : s.near
          ? `${s.near.name}${s.near.isPartner ? " 💍" : ""}`
          : s.place
            ? LANDMARK_TITLE[s.place]
            : "Reformed City";

  const hideHudControls = !!s.tryOn || !!s.pendingPurchase;

  return (
    <div className="pointer-events-none absolute inset-0 font-display text-foreground">
      <div className="hud-panel pointer-events-auto absolute left-3 top-3 max-w-[52%] p-2.5 text-xs">
        <p className="break-words font-bold">
          {s.profile?.name} · {rankName(s.xp)} {s.partner ? "💍" : ""}{" "}
          {s.wanted ? "⭐".repeat(s.wanted) : ""}
        </p>
        <p className="text-lg font-extrabold text-primary">{naira(s.money)}</p>
        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
          <Bar label="🍛" title="Hunger" v={s.hunger} />
          <Bar label="⚡" title="Energy" v={s.energy} />
          <Bar label="🚽" title="Bladder" v={100 - s.bladder} />
          <Bar label="🎉" title="Fun" v={s.fun} />
        </div>
        <p className="mt-1.5 text-[9px] text-muted-foreground" role="status">
          {s.saveError
            ? "Save unavailable — check browser storage"
            : s.lastSaved
              ? "Progress saved"
              : "Autosave on"}
        </p>
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 flex gap-1">
        {activeInterior === "home" && (
          <Button
            variant="game"
            size="sm"
            className="h-9 gap-1 px-2.5 text-xs font-bold"
            title="Upgrade House & Ride"
            aria-label="Upgrade House & Ride"
            onClick={() => s.patch({ dialog: "upgrade" })}
          >
            <ArrowUpCircle size={15} />
            Upgrade
          </Button>
        )}
        <Button
          variant="game"
          size="icon"
          title={activeInterior === "home" ? "Decorate room" : "Find home"}
          aria-label={activeInterior === "home" ? "Decorate room" : "Find home"}
          onClick={() =>
            s.patch(activeInterior === "home" ? { dialog: "decorate" } : { waypoint: "home" })
          }
        >
          {activeInterior === "home" ? <Paintbrush /> : <Home />}
        </Button>
        <Button
          variant="game"
          size="icon"
          title="Save progress"
          aria-label="Save progress"
          onClick={saveNow}
        >
          <Save />
        </Button>
        <Button
          variant="game"
          size="icon"
          title={s.muted ? "Unmute" : "Mute"}
          aria-label={s.muted ? "Unmute" : "Mute"}
          onClick={() => {
            const next = !s.muted;
            setVoiceMuted(next);
            s.patch({ muted: next });
          }}
        >
          {s.muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </div>

      {!hideHudControls && <MiniMap />}

      {!hideHudControls && (
        <div className="absolute bottom-40 left-5 flex items-center gap-1 text-xs">
          {day ? <Sun size={14} /> : <Moon size={14} />}
          {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
        </div>
      )}

      {goal && !s.inside && !hideHudControls && (
        <div className="hud-panel absolute left-5 top-36 flex items-center gap-2 px-2 py-1 text-xs">
          <Navigation size={16} style={{ transform: `rotate(${bearing}rad)` }} />
          {Math.round(Math.hypot(goal.x - rt.player.x, goal.z + 12 - rt.player.z))} m
        </div>
      )}

      {toast && !s.tryOn && !s.pendingPurchase && (
        <div
          role="status"
          className="hud-panel absolute inset-x-4 top-[30%] mx-auto max-w-md whitespace-pre-line p-3 text-center text-sm"
        >
          {toast}
        </div>
      )}

      {s.busy && (
        <div className="hud-panel absolute left-1/2 top-1/2 max-w-[80%] -translate-x-1/2 px-4 py-2 text-sm">
          {s.busy.label}
        </div>
      )}

      {s.arrestStage?.kind === "prompt" && (
        <div
          className="pointer-events-auto absolute inset-x-4 top-1/4 z-30 mx-auto max-w-sm"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="hud-panel space-y-3 border-2 border-destructive p-4 text-center shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-destructive">
              🚓 Police Arrest — Act Fast!
            </p>
            <p className="text-4xl font-black text-primary">
              {Math.max(0, Math.ceil((s.arrestStage.expiresAt - Date.now()) / 1000))}s
            </p>
            <p className="text-xs text-muted-foreground">
              Pay the {naira(POLICE_FINE)} fine before the timer hits zero, or you will be escorted
              to the Police Jail Cell for 5 minutes.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 font-bold"
                disabled={s.money < POLICE_FINE}
                onClick={payArrestFine}
              >
                Pay {naira(POLICE_FINE)} Fine
              </Button>
              <Button variant="game" className="shrink-0 text-xs" onClick={startPoliceEscort}>
                Go to Jail
              </Button>
            </div>
          </div>
        </div>
      )}

      {s.arrestStage?.kind === "escort" && (
        <div className="absolute inset-x-4 top-1/4 z-30 mx-auto max-w-sm text-center">
          <div className="hud-panel space-y-1 border border-primary/40 p-4 shadow-lg">
            <p className="text-base font-extrabold">🚓 Police Escort to Station</p>
            <p className="text-xs text-muted-foreground">
              Transferring in patrol vehicle to Jail Cell…
            </p>
          </div>
        </div>
      )}

      {jail > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-16 text-center">
          <div className="hud-panel mx-auto inline-block border border-destructive/40 px-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">
              🔒 Locked in 3D Jail Cell
            </p>
            <p className="text-2xl font-extrabold text-primary">
              {Math.floor(jail / 60000)}:
              {String(Math.floor((jail % 60000) / 1000)).padStart(2, "0")}
            </p>
          </div>
        </div>
      )}

      {!hideHudControls && !s.arrestStage && (
        <div className="pointer-events-auto absolute bottom-8 right-3 flex max-h-[42dvh] w-[52%] max-w-xs flex-col items-end gap-1.5 overflow-y-auto">
          <p className="hud-panel max-w-full px-2 py-1 text-right text-xs font-bold">
            {locationTitle}
          </p>
          {acts
            .filter((a) => !(jail > 0 && a.label.includes("Exit Police")))
            .map((a) => (
              <Button
                key={a.label}
                variant="game"
                className="h-auto min-h-10 max-w-full justify-start whitespace-normal px-3 py-2 text-left text-xs"
                disabled={a.disabled || !!s.busy || !!s.dialog}
                onClick={a.run}
              >
                {a.label}
              </Button>
            ))}
        </div>
      )}

      {!hideHudControls && <Joystick />}
      <GameDialogs />
    </div>
  );
}
