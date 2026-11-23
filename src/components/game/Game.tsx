import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, saveNow } from "@/game/store";
import { rt } from "@/game/runtime";
import { createNpcs, createCars, stepNpcs, stepCars, spawnPolice, clearPolice } from "@/game/npcs";
import { WATER_X, resolveCollision, placeAt, landmarkCenter } from "@/game/world";
import { arrest, clamp, POLICE_FINE, PUSH_WANTED_STARS, naira } from "@/game/rules";
import { fx, setClubMix, initAudio, setMuted } from "@/game/audio";
import { City } from "./City";
import { Landmarks } from "./Landmarks";
import { Lighting } from "./Lighting";
import { Crowd } from "./Crowd";
import { Humanoid } from "./Humanoid";
import { Hud } from "./Hud";
import { CharacterCreate } from "./CharacterCreate";
import { Apartment } from "./Apartment";
import { Vehicles } from "./Vehicles";
import { movePlayer, trafficSolids } from "@/game/sim/obstacles";
import { nearStation } from "@/game/sim/apartment";
import { driveStep, crashResult, AUTOSAVE_MS } from "@/game/sim/mobility";
import { enterApartment, leaveApartment } from "@/game/life";
import { LINES, pickLine, speakSubtitle } from "@/game/voice";

function Stepper() {
  const acc = useRef(0);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    rt.t += dt;
    const s = useGame.getState(), p = rt.player, now = Date.now();
    const jailed = s.jailUntil > now;
    if (jailed) {
      const c = landmarkCenter("police"); p.x = c.x; p.z = c.z + 11.5; p.speed = 0;
    } else if (!s.busy && !s.dialog) {
      let ix = rt.input.x, iy = rt.input.y;
      const k = rt.keys;
      if (k.has("KeyW") || k.has("ArrowUp")) iy += 1;
      if (k.has("KeyS") || k.has("ArrowDown")) iy -= 1;
      if (k.has("KeyA") || k.has("ArrowLeft")) ix -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) ix += 1;
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      const y = s.inside ? 0 : rt.camYaw;
      const vx = -Math.sin(y) * iy + Math.cos(y) * ix, vz = -Math.cos(y) * iy - Math.sin(y) * ix;
      const mag = Math.hypot(vx, vz);
      let sp = p.swim ? 2.6 : k.has("ShiftLeft") || len > 0.95 ? 6.5 : 3.8;
      if (s.energy < 5 || s.hunger < 5) sp *= 0.55;
      const solids = trafficSolids(rt.cars, s.vehicles);
      const vehicle = s.vehicles.find(v => v.id === rt.driving);
      let hit = false;
      if (vehicle && !s.inside) {
        const v = { speed: rt.vehicleSpeed, heading: vehicle.heading };
        const motion = driveStep(v, iy, ix, dt, vehicle.kind);
        hit = movePlayer(p, motion.dx, motion.dz, false, [], solids, vehicle.kind === "car" ? 1.25 : .6, vehicle.id);
        rt.vehicleSpeed = hit ? v.speed * crashResult().speedMultiplier : v.speed;
        p.heading = v.heading; p.speed = Math.abs(rt.vehicleSpeed);
        vehicle.x = p.x; vehicle.z = p.z; vehicle.heading = p.heading;
        rt.camYaw = p.heading + Math.PI;
      } else if (mag > 0.05) {
        hit = movePlayer(p, vx * sp * dt, vz * sp * dt, s.inside, s.decor, solids);
        let d = Math.atan2(vx, vz) - p.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
        p.heading += d * Math.min(1, dt * 12);
        p.speed = sp * Math.min(1, mag);
      } else p.speed = 0;
      p.x = Math.min(p.x, WATER_X + 60);
      if (hit && !s.inside && now > rt.crashCooldown) {
        rt.crashCooldown = now + 4000;
        const collidedVehicle = !!vehicle || solids.some(v => Math.hypot(v.x - p.x, v.z - p.z) < 4);
        if (collidedVehicle) {
          rt.smoke = { x: p.x, z: p.z, until: now + 4000 };
          speakSubtitle("Driver", pickLine(LINES.crash), "male", s.muted, s.notify);
        }
      }
    } else p.speed = 0;
    p.swim = !s.inside && p.x > WATER_X + 0.8;
    p.y = p.swim ? -0.05 : 0;
    p.phase += dt * p.speed * 2.4;

    const ev = s.inside ? [] : stepNpcs(rt.npcs, dt, p.x, p.z);
    if (!s.inside) stepCars(rt.cars, dt, p.x, p.z);
    for (const e of ev) {
      if (e.type === "crime" && s.wanted === 0 && !jailed) {
        fx.splash();
        useGame.getState().patch({ wanted: PUSH_WANTED_STARS });
        spawnPolice(rt.npcs, p.x, p.z); fx.siren(true); rt.calm = 0;
        s.notify(`💦 You pushed ${e.npc.name} into the river! ⭐⭐ Police are coming. RUN!`);
      }
      if (e.type === "caught" && useGame.getState().wanted > 0) {
        const r = arrest(useGame.getState().money, now);
        clearPolice(rt.npcs); fx.siren(false);
        if (r.kind === "fine") { useGame.getState().patch({ wanted: 0, money: r.money }); s.notify(`🚓 Caught! You paid a ${naira(POLICE_FINE)} fine.`); }
        else { useGame.getState().patch({ wanted: 0, jailUntil: r.until }); s.notify("🚓 Caught with no money for the fine. 5 minutes in the police station!"); }
        break;
      }
    }
    if (useGame.getState().wanted > 0) {
      let md = 1e9;
      for (const n of rt.npcs) if (n.mode === "chase") md = Math.min(md, Math.hypot(n.x - p.x, n.z - p.z));
      rt.calm = md > 30 ? rt.calm + dt : 0;
      if (rt.calm > 15) { clearPolice(rt.npcs); fx.siren(false); useGame.getState().patch({ wanted: 0 }); s.notify("😮‍💨 You lost the police. Wanted level cleared."); }
    }

    let best = -1, bd = 2.8;
    for (const n of s.inside || rt.driving ? [] : rt.npcs) {
      if (n.mode === "off" || n.role === "police") continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < bd) { bd = d; best = n.id; }
    }
    if ((s.near?.id ?? -1) !== best) {
      const n = best >= 0 ? rt.npcs[best] : undefined;
      useGame.getState().patch({ near: n ? { id: n.id, name: n.name, gender: n.gender, isPartner: s.partner?.id === n.id } : null });
    }
    const station = s.inside ? nearStation(p.x, p.z) : null;
    if (station !== s.station) useGame.getState().patch({ station });
    const place = s.inside ? "home" : placeAt(p.x, p.z);
    if (place !== s.place) useGame.getState().patch({ place });

    acc.current += dt;
    if (acc.current >= 1) {
      const a = acc.current; acc.current = 0;
      const st = useGame.getState();
      const moving = p.speed > 5 || p.swim ? 2 : 1;
      let bladder = st.bladder + 0.28 * a;
      if (bladder >= 100) { bladder = 0; st.addXp(-15); st.notify("😳 Oops! You couldn't hold it. People are laughing. -15 XP"); }
      st.patch({
        hunger: clamp(st.hunger - 0.22 * a), energy: clamp(st.energy - 0.09 * a * moving), bladder,
        fun: clamp(st.fun - 0.12 * a + (st.place === "club" ? 1.2 * a : 0)),
        time: (st.time + a * (24 / (16 * 60))) % 24,
      });
      if (st.jailUntil && st.jailUntil <= now) { st.patch({ jailUntil: 0 }); st.notify("🔓 You're free. Behave yourself!"); }
    }

    const club = landmarkCenter("club"), cd = Math.hypot(p.x - club.x, p.z - club.z);
    setClubMix(s.inside ? 0 : clamp(1.1 - cd / 70, 0, 1) * 0.9, !s.inside && cd < 12);

    const cam = state.camera, d = p.swim ? 8 : 7;
    const tx = s.inside ? 0 : p.x + Math.sin(rt.camYaw) * d, tz = s.inside ? 11 : p.z + Math.cos(rt.camYaw) * d;
    const f = 1 - Math.exp(-dt * 6);
    cam.position.x += (tx - cam.position.x) * f;
    cam.position.y += ((s.inside ? 13 : p.y + 4.2) - cam.position.y) * f;
    cam.position.z += (tz - cam.position.z) * f;
    cam.lookAt(s.inside ? 0 : p.x, s.inside ? 0 : p.y + 1.4, s.inside ? 0 : p.z);
    state.gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "1");
  });
  return null;
}

function Player() {
  const profile = useGame((s) => s.profile);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = rt.player;
    if (!g.current) return;
    const vehicle = useGame.getState().vehicles.find(v => v.id === rt.driving);
    g.current.visible = vehicle?.kind !== "car";
    g.current.position.set(p.x, p.y + (vehicle?.kind === "bike" ? .3 : 0), p.z);
    g.current.rotation.set(p.swim ? 1.35 : 0, p.heading, 0, "YXZ");
  });
  if (!profile) return null;
  return (
    <group ref={g}>
      <Humanoid look={profile.look} female={profile.gender === "female"} getPose={() => {
        const p = rt.player;
        return { phase: p.phase, amp: Math.min(1.2, p.speed / 3.5), t: rt.t, mode: rt.driving ? "sit" : p.swim ? "swim" : p.act ?? "walk" };
      }} />
    </group>
  );
}

function World() {
  const [ready] = useState(() => {
    const saved = useGame.getState();
    Object.assign(rt.player, saved.position, { y: 0, speed: 0 }); rt.camYaw = saved.position.camYaw;
    if (saved.inside) { const pos = saved.position; if (Math.abs(pos.x) > 6.6 || Math.abs(pos.z) > 5.6) { rt.player.x = 0; rt.player.z = 2; } }
    else resolveCollision(rt.player);
    rt.npcs = saved.savedNpcs.length ? saved.savedNpcs.map(n => ({ ...n })) : createNpcs(rt.player.x, rt.player.z);
    rt.cars = createCars(26, rt.player.x, rt.player.z);
    const partner = useGame.getState().partner;
    const pn = partner ? rt.npcs[partner.id] : undefined;
    if (partner && pn) { pn.name = partner.name; pn.base = "follow"; pn.mode = "follow"; pn.x = rt.player.x - 2; pn.z = rt.player.z - 2; }
    return true;
  });
  const drag = useRef<{ x: number; id: number } | null>(null);
  const muted = useGame((s) => s.muted);
  const inside = useGame((s) => s.inside);
  useEffect(() => setMuted(muted), [muted]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement) return; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); rt.keys.add(e.code); initAudio(); };
    const up = (e: KeyboardEvent) => rt.keys.delete(e.code);
    const reset = () => { rt.keys.clear(); rt.input.x = 0; rt.input.y = 0; saveNow(); };
    const timer = window.setInterval(saveNow, AUTOSAVE_MS);
    window.addEventListener("blur", reset); window.addEventListener("pagehide", saveNow);
    const first = () => initAudio();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("pointerdown", first);
    if (import.meta.env.DEV) Object.assign(window, { __game: { get state() { return { ...useGame.getState(), player: { ...rt.player }, driving: rt.driving }; }, patch: useGame.getState().patch, teleport: (x: number, z: number) => { rt.player.x = x; rt.player.z = z; }, enterApartment, leaveApartment, save: saveNow } });
    return () => { clearInterval(timer); window.removeEventListener("blur", reset); window.removeEventListener("pagehide", saveNow); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("pointerdown", first); };
  }, []);
  return (
    <div className="fixed inset-0 touch-none select-none overflow-hidden bg-background">
      <div className="absolute inset-0"
        onPointerDown={(e) => { drag.current = { x: e.clientX, id: e.pointerId }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
         onPointerMove={(e) => { if (!inside && !rt.driving && drag.current?.id === e.pointerId) { rt.camYaw -= (e.clientX - drag.current.x) * 0.007; drag.current.x = e.clientX; } }}
        onPointerUp={() => { drag.current = null; }}
      >
        {ready && (
          <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 62, near: 0.1, far: 320, position: inside ? [0, 13, 11] : [rt.player.x, 4.2, rt.player.z + 7] }}>
            <Stepper />
            <Lighting />
            {inside ? <Apartment /> : <><City /><Landmarks /><Crowd /><Vehicles /></>}
            <Player />
          </Canvas>
        )}
      </div>
      <Hud />
    </div>
  );
}

export default function Game() {
  const profile = useGame((s) => s.profile);
  return profile ? <World /> : <CharacterCreate />;
}
