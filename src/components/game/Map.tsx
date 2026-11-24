import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";
import { rt } from "@/game/runtime";
import {
  B,
  LANDMARK_CHUNKS,
  LANDMARK_TITLE,
  landmarkCenter,
  WATER_X,
  type Landmark,
} from "@/game/world";
import { STATIONS, BATH_WALLS, TERRACE_BOUNDS, GARAGE_BOUNDS } from "@/game/sim/apartment";
import { INTERIORS } from "@/game/sim/interiors";

export function MapCanvas({ large = false }: { large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const fg = css.getPropertyValue("--foreground");
    const primary = css.getPropertyValue("--primary");
    const muted = css.getPropertyValue("--muted");
    const card = css.getPropertyValue("--card");

    const draw = () => {
      const s = useGame.getState();
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = card;
      ctx.fillRect(0, 0, size, size);

      if (s.inside && !large) {
        const activeInterior = s.interior ?? "home";
        if (activeInterior === "home") {
          const sx = size / 24;
          const sz = size / 14;
          const ox = 8;
          const oz = 7;
          const terrace = TERRACE_BOUNDS(s.house);
          ctx.strokeStyle = muted;
          ctx.lineWidth = 6;
          ctx.strokeRect(sx, sz, sx * 14, sz * 12);
          ctx.strokeRect(
            (terrace.minX + ox) * sx,
            (terrace.minZ + oz) * sz,
            terrace.width * sx,
            (terrace.maxZ - terrace.minZ) * sz,
          );
          ctx.strokeRect(
            (GARAGE_BOUNDS.minX + ox) * sx,
            (GARAGE_BOUNDS.minZ + oz) * sz,
            (GARAGE_BOUNDS.maxX - GARAGE_BOUNDS.minX) * sx,
            (GARAGE_BOUNDS.maxZ - GARAGE_BOUNDS.minZ) * sz,
          );
          for (const w of BATH_WALLS) {
            ctx.fillStyle = fg;
            ctx.fillRect(
              (w.x + ox - w.hx) * sx,
              (w.z + oz - w.hz) * sz,
              Math.max(w.hx * 2 * sx, 6),
              Math.max(w.hz * 2 * sz, 6),
            );
          }
          for (const f of STATIONS) {
            ctx.fillStyle = muted;
            ctx.fillRect(
              (f.x + ox - f.hx) * sx,
              (f.z + oz - f.hz) * sz,
              Math.max(f.hx * 2 * sx, 8),
              Math.max(f.hz * 2 * sz, 8),
            );
          }
          ctx.fillStyle = primary;
          ctx.beginPath();
          ctx.arc((rt.player.x + ox) * sx, (rt.player.z + oz) * sz, 8, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        const spec = INTERIORS[activeInterior];
        const sx = size / (spec.hx * 2 + 2);
        const sz = size / (spec.hz * 2 + 2);
        const ox = spec.hx + 1;
        const oz = spec.hz + 1;
        ctx.strokeStyle = muted;
        ctx.lineWidth = 8;
        ctx.strokeRect(sx, sz, spec.hx * 2 * sx, spec.hz * 2 * sz);
        for (const sol of spec.solids) {
          ctx.fillStyle = muted;
          ctx.fillRect(
            (sol.x + ox - sol.hx) * sx,
            (sol.z + oz - sol.hz) * sz,
            Math.max(sol.hx * 2 * sx, 10),
            Math.max(sol.hz * 2 * sz, 10),
          );
        }
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc((rt.player.x + ox) * sx, (rt.player.z + oz) * sz, 9, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const cx = large ? 8 : rt.player.x;
      const cz = large ? 0 : rt.player.z;
      const span = large ? 220 : 95;
      const scale = size / span;
      const px = (x: number) => (x - cx) * scale + size / 2;
      const pz = (z: number) => (z - cz) * scale + size / 2;
      ctx.fillStyle = muted;
      for (let x = Math.floor((cx - span) / B); x < Math.ceil((cx + span) / B); x++)
        for (let z = Math.floor((cz - span) / B); z < Math.ceil((cz + span) / B); z++) {
          if (x * B < WATER_X) ctx.fillRect(px(x * B - 9), pz(z * B - 9), 18 * scale, 18 * scale);
        }
      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(px(WATER_X), 0, size, size);
      ctx.globalAlpha = 1;
      for (const [key, [x, z]] of Object.entries(LANDMARK_CHUNKS)) {
        const l = key as Landmark;
        const wx = px(x * B);
        const wz = pz(z * B);
        ctx.fillStyle = l === s.waypoint || l === "home" ? primary : fg;
        ctx.font = `${large ? 21 : 28}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(LANDMARK_TITLE[l].split(" ")[0] ?? "•", wx, wz + 8);
      }
      if (s.waypoint) {
        const goal = landmarkCenter(s.waypoint);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(px(rt.player.x), pz(rt.player.z));
        ctx.lineTo(px(goal.x), pz(goal.z + 12));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px(rt.player.x), pz(rt.player.z));
      ctx.rotate(-rt.player.heading);
      ctx.fillStyle = primary;
      ctx.strokeStyle = card;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.lineTo(-9, -9);
      ctx.lineTo(0, -4);
      ctx.lineTo(9, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    draw();
    const timer = setInterval(draw, 150);
    return () => clearInterval(timer);
  }, [large]);
  return <canvas ref={ref} className="map-canvas" aria-label={large ? "City map" : "Live radar"} />;
}

export function MiniMap() {
  const s = useGame();
  const goal = s.waypoint ? landmarkCenter(s.waypoint) : null;
  const distance = goal
    ? Math.round(Math.hypot(goal.x - rt.player.x, goal.z + 12 - rt.player.z))
    : 0;
  return (
    <div className="pointer-events-auto absolute right-3 top-16 w-28 sm:w-36">
      <Button
        variant="game"
        className="h-auto w-full p-1"
        title="Open city map"
        aria-label="Open city map"
        onClick={() => s.patch({ dialog: "map" })}
      >
        <MapCanvas />
      </Button>
      {s.waypoint && !s.inside && (
        <p className="hud-panel mt-1 p-1 text-center text-[10px]">
          {LANDMARK_TITLE[s.waypoint]} · {distance} m
        </p>
      )}
    </div>
  );
}
