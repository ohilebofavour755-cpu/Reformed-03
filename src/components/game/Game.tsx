import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, saveNow } from "@/game/store";
import { rt } from "@/game/runtime";
import {
  createNpcs,
  createInteriorNpcs,
  createCars,
  stepNpcs,
  stepCars,
  spawnPolice,
  clearPolice,
} from "@/game/npcs";
import {
  WATER_X,
  BEACH_X,
  resolveCollision,
  placeAt,
  landmarkCenter,
  onAsphaltRoad,
} from "@/game/world";
import { clamp } from "@/game/rules";
import { fx, setClubMix, initAudio, setMuted } from "@/game/audio";
import { isMobileViewport } from "@/game/materials";
import {
  cloneGlbTemplate,
  createCharacterAnimator,
  getCachedGlbWithFallback,
  preloadAllCharacterGlbs,
  subscribeGlbRegistry,
  type GlbTemplate,
} from "@/game/glbRegistry";
import { City } from "./City";
import { Landmarks } from "./Landmarks";
import { Lighting } from "./Lighting";
import { Crowd } from "./Crowd";
import { Hud } from "./Hud";
import { CharacterCreate } from "./CharacterCreate";
import { Apartment } from "./Apartment";
import { InteriorScene } from "./Interiors";
import { Vehicles } from "./Vehicles";
import { movePlayer, trafficSolids } from "@/game/sim/obstacles";
import { nearStation, apartmentBlocked } from "@/game/sim/apartment";
import { nearInteriorStation } from "@/game/sim/interiors";
import { driveStep, crashResult, AUTOSAVE_MS } from "@/game/sim/mobility";
import { enterApartment, leaveApartment } from "@/game/life";
import {
  standUp,
  triggerPoliceCatch,
  startPoliceEscort,
  lockInPoliceJailCell,
} from "@/game/actions";
import { LINES, pickLine, speakSubtitle, setVoiceMuted } from "@/game/voice";

function MobileFramePacer({ mobile }: { mobile: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!mobile) return;
    let raf = 0;
    let last = 0;
    const minInterval = 1000 / 30; // Strict 30 FPS cap for mobile cooling
    const loop = (now: number) => {
      if (now - last >= minInterval) {
        last = now;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mobile, invalidate]);
  return null;
}

function Stepper() {
  const acc = useRef(0);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.067);
    rt.t += dt;
    const s = useGame.getState();
    const p = rt.player;
    const now = Date.now();
    const jailed = s.jailUntil > now;
    const activeInterior = s.inside ? (s.interior ?? "home") : null;

    if (jailed && activeInterior !== "police") {
      lockInPoliceJailCell();
    } else if (s.arrestStage?.kind === "prompt") {
      p.speed = 0;
      if (now >= s.arrestStage.expiresAt) {
        startPoliceEscort();
      }
    } else if (s.arrestStage?.kind === "escort") {
      const dest = landmarkCenter("police");
      const targetX = dest.x;
      const targetZ = dest.z + 12;
      const total = Math.max(1, s.arrestStage.arriveAt - s.arrestStage.startedAt);
      const tNorm = Math.min(1, Math.max(0, (now - s.arrestStage.startedAt) / total));
      p.x = s.arrestStage.startX + (targetX - s.arrestStage.startX) * tNorm;
      p.z = s.arrestStage.startZ + (targetZ - s.arrestStage.startZ) * tNorm;
      p.heading = Math.atan2(targetX - s.arrestStage.startX, targetZ - s.arrestStage.startZ);
      p.speed = 0;
      rt.camYaw = p.heading + Math.PI;
      if (tNorm >= 1) {
        lockInPoliceJailCell();
      }
    } else if (!s.busy && !s.dialog && !s.tryOn && !s.pendingPurchase) {
      let ix = rt.input.x;
      let iy = rt.input.y;
      const k = rt.keys;
      if (k.has("KeyW") || k.has("ArrowUp")) iy += 1;
      if (k.has("KeyS") || k.has("ArrowDown")) iy -= 1;
      if (k.has("KeyA") || k.has("ArrowLeft")) ix -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) ix += 1;
      const len = Math.hypot(ix, iy);
      if (len > 1) {
        ix /= len;
        iy /= len;
      }

      if (len > 0.25 && (p.act === "sit" || p.act === "dance")) {
        if (p.act === "sit") standUp();
        else p.act = null;
      }

      if (p.act === "sit" || p.act === "sleep") {
        p.speed = 0;
      } else {
        const y = s.inside ? 0 : rt.camYaw;
        const vx = -Math.sin(y) * iy + Math.cos(y) * ix;
        const vz = -Math.cos(y) * iy - Math.sin(y) * ix;
        const mag = Math.hypot(vx, vz);
        let sp = p.swim ? 2.6 : k.has("ShiftLeft") || len > 0.95 ? 6.5 : 3.8;
        if (s.energy < 5 || s.hunger < 5) sp *= 0.55;
        const solids = trafficSolids(rt.cars, s.vehicles);
        const vehicle = s.vehicles.find((v) => v.id === rt.driving);
        let hit = false;
        if (vehicle && !s.inside) {
          const v = { speed: rt.vehicleSpeed, heading: vehicle.heading };
          const motion = driveStep(v, iy, ix, dt, vehicle.kind);
          const vRad = vehicle.kind === "car" || vehicle.kind === "supercar" ? 1.25 : 0.65;
          hit = movePlayer(
            p,
            motion.dx,
            motion.dz,
            null,
            [],
            solids,
            vRad,
            vehicle.id,
            false,
            s.house,
            true,
            false,
          );
          rt.vehicleSpeed = hit ? v.speed * crashResult().speedMultiplier : v.speed;
          p.heading = v.heading;
          p.speed = Math.abs(rt.vehicleSpeed);
          vehicle.x = p.x;
          vehicle.z = p.z;
          vehicle.heading = p.heading;
          rt.camYaw = p.heading + Math.PI;
        } else if (mag > 0.05) {
          hit = movePlayer(
            p,
            vx * sp * dt,
            vz * sp * dt,
            activeInterior,
            s.decor,
            solids,
            0.4,
            undefined,
            rt.doorLocked,
            s.house,
            false,
            activeInterior === "police" && jailed,
          );
          let d = Math.atan2(vx, vz) - p.heading;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          p.heading += d * Math.min(1, dt * 12);
          p.speed = sp * Math.min(1, mag);
        } else p.speed = 0;
        if (!s.inside) p.x = Math.min(p.x, WATER_X + 60);
        if (hit && !s.inside && now > rt.crashCooldown) {
          rt.crashCooldown = now + 4000;
          const collidedVehicle =
            !!vehicle || solids.some((v) => Math.hypot(v.x - p.x, v.z - p.z) < 4);
          if (collidedVehicle) {
            rt.smoke = { x: p.x, z: p.z, until: now + 4000 };
            speakSubtitle("Driver", pickLine(LINES.crash), "male", s.muted, s.notify);
          }
        }
      }
    } else p.speed = 0;

    p.swim = !s.inside && !rt.driving && !s.arrestStage && p.x > WATER_X + 0.8;
    p.y = p.swim ? -0.05 : p.sitY;
    p.phase += dt * p.speed * 2.4;

    const ev = s.inside ? [] : stepNpcs(rt.npcs, dt, p.x, p.z);
    if (!s.inside) stepCars(rt.cars, dt, p.x, p.z);
    for (const e of ev) {
      if (e.type === "crime" && s.wanted === 0 && !jailed && !s.arrestStage) {
        fx.splash();
        useGame.getState().patch({ wanted: 2 });
        spawnPolice(rt.npcs, p.x, p.z);
        fx.siren(true);
        rt.calm = 0;
        s.notify(`💦 You pushed ${e.npc.name} into the river! ⭐⭐ Police are coming. RUN!`);
      }
      if (e.type === "caught" && useGame.getState().wanted > 0 && !useGame.getState().arrestStage) {
        triggerPoliceCatch();
        break;
      }
    }
    if (useGame.getState().wanted > 0 && !useGame.getState().arrestStage) {
      let md = 1e9;
      for (const n of rt.npcs)
        if (n.mode === "chase") md = Math.min(md, Math.hypot(n.x - p.x, n.z - p.z));
      rt.calm = md > 30 ? rt.calm + dt : 0;
      if (rt.calm > 15) {
        clearPolice(rt.npcs);
        fx.siren(false);
        useGame.getState().patch({ wanted: 0 });
        s.notify("😮‍💨 You lost the police. Wanted level cleared.");
      }
    }

    // Nearby NPC check (works outdoors AND inside walk-in buildings)
    const npcPool = s.inside ? rt.interiorNpcs : rt.npcs;
    let best = -1;
    let bd = 2.7;
    if (!rt.driving && !s.tryOn) {
      for (const n of npcPool) {
        if (n.mode === "off" || n.role === "police") continue;
        const d = Math.hypot(n.x - p.x, n.z - p.z);
        if (d < bd) {
          bd = d;
          best = n.id;
        }
      }
    }
    if ((s.near?.id ?? -1) !== best) {
      const n = best >= 0 ? npcPool.find((x) => x.id === best) : undefined;
      useGame.getState().patch({
        near: n
          ? {
              id: n.id,
              name: n.name,
              gender: n.gender,
              isPartner: !s.inside && s.partner?.id === n.id,
              isInterior: s.inside,
            }
          : null,
      });
    }

    // Station & Landmark tracking
    if (activeInterior === "home") {
      const station = nearStation(p.x, p.z);
      if (station !== s.station) useGame.getState().patch({ station });
      if (s.interiorStation !== null) useGame.getState().patch({ interiorStation: null });
    } else if (activeInterior) {
      const ist = nearInteriorStation(activeInterior, p.x, p.z);
      if (ist !== s.interiorStation) useGame.getState().patch({ interiorStation: ist });
      if (s.station !== null) useGame.getState().patch({ station: null });
    } else {
      if (s.station !== null || s.interiorStation !== null) {
        useGame.getState().patch({ station: null, interiorStation: null });
      }
      const place = placeAt(p.x, p.z);
      if (place !== s.place) useGame.getState().patch({ place });
    }

    // Needs & Day/Night Clock
    acc.current += dt;
    if (acc.current >= 1) {
      const a = acc.current;
      acc.current = 0;
      const st = useGame.getState();
      const moving = p.speed > 5 || p.swim ? 2 : 1;
      const dancing = p.act === "dance";
      const sitting = p.act === "sit" && !st.busy;
      let bladder = st.bladder + 0.28 * a;
      if (bladder >= 100) {
        bladder = 0;
        st.addXp(-15);
        st.notify("😳 Oops! You couldn't hold it. People are laughing. -15 XP");
      }
      st.patch({
        hunger: clamp(st.hunger - 0.22 * a),
        energy: clamp(
          st.energy - 0.09 * a * moving + (sitting ? 1.4 * a : 0) - (dancing ? 0.2 * a : 0),
        ),
        bladder,
        fun: clamp(
          st.fun -
            0.12 * a +
            (st.interior === "club" ? 1.1 * a : 0) +
            (dancing ? 2.2 * a : 0) +
            (sitting ? 1.0 * a : 0),
        ),
        time: (st.time + a * (24 / (16 * 60))) % 24,
      });
      if (dancing && Math.random() < 0.25) st.addXp(1);
      if (st.jailUntil && st.jailUntil <= now) {
        st.patch({ jailUntil: 0 });
        st.notify("🔓 You're free. Behave yourself!");
      }
    }

    const club = landmarkCenter("club");
    const cd = s.interior === "club" ? 2 : s.inside ? 999 : Math.hypot(p.x - club.x, p.z - club.z);
    setClubMix(
      s.inside && s.interior !== "club" ? 0 : clamp(1.1 - cd / 70, 0, 1) * 0.9,
      s.interior === "club" || (!s.inside && cd < 12),
    );

    // Camera positioning (including close-up Live 3D Try-On zoom & rotation!)
    const cam = state.camera;
    const f = 1 - Math.exp(-dt * 7);
    if (s.tryOn) {
      const zoomDist = s.tryOn === "hair" || s.tryOn === "nails" ? 2.15 : 2.95;
      const lookY = s.tryOn === "hair" ? 1.55 : s.tryOn === "nails" ? 1.05 : 0.95;
      const camY = s.tryOn === "hair" ? 1.72 : s.tryOn === "nails" ? 1.25 : 1.35;
      const tx = p.x + Math.sin(rt.tryOnYaw) * zoomDist;
      const tz = p.z + Math.cos(rt.tryOnYaw) * zoomDist;
      cam.position.x += (tx - cam.position.x) * f;
      cam.position.y += (camY - cam.position.y) * f;
      cam.position.z += (tz - cam.position.z) * f;
      cam.lookAt(p.x, lookY, p.z);
    } else if (s.inside) {
      const isHome = activeInterior === "home";
      const tx = isHome ? p.x * 0.35 + 1.8 : p.x * 0.25;
      const tz = activeInterior === "club" ? 13.5 : isHome ? 14.5 : 11.4;
      const ty = activeInterior === "club" ? 14.0 : isHome ? 13.8 : 12.2;
      cam.position.x += (tx - cam.position.x) * f;
      cam.position.y += (ty - cam.position.y) * f;
      cam.position.z += (tz - cam.position.z) * f;
      cam.lookAt(isHome ? p.x * 0.4 + 1.5 : p.x * 0.35, 0.35, p.z * 0.28);
    } else {
      const d = rt.driving ? 16.5 : p.swim ? 14.5 : 14.2;
      const hCam = rt.driving ? 9.2 : 8.4;
      const tx = p.x + Math.sin(rt.camYaw) * d;
      const tz = p.z + Math.cos(rt.camYaw) * d;
      cam.position.x += (tx - cam.position.x) * f;
      cam.position.y += (p.y + hCam - cam.position.y) * f;
      cam.position.z += (tz - cam.position.z) * f;
      cam.lookAt(p.x, p.y + 1.65, p.z);
    }

    state.gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "1");
  });
  return null;
}

function GlbPlayerModel({ tpl }: { tpl: GlbTemplate }) {
  const innerRef = useRef<THREE.Group>(null);
  const { root, animator } = useMemo(() => {
    const r = cloneGlbTemplate(tpl);
    return { root: r, animator: createCharacterAnimator(r, tpl, 0) };
  }, [tpl]);

  useEffect(() => {
    return () => {
      animator.dispose();
    };
  }, [animator]);

  useFrame((_, raw) => {
    const p = rt.player;
    const dt = Math.min(raw, 0.067);
    const intent = rt.driving
      ? "sit"
      : p.swim
        ? "swim"
        : p.act === "dance"
          ? "dance"
          : p.act === "sit"
            ? "sit"
            : p.speed > 4.6
              ? "run"
              : p.speed > 0.15
                ? "walk"
                : "idle";
    animator.update(dt, p.phase, rt.t, p.speed, intent, innerRef.current);
    if (innerRef.current && p.act === "sleep") {
      innerRef.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group ref={innerRef}>
      <primitive object={root} />
    </group>
  );
}

function Player() {
  const look = useGame((s) => s.previewLook ?? s.profile?.look ?? null);
  const gender = useGame((s) => s.profile?.gender ?? "female");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    preloadAllCharacterGlbs();
    return subscribeGlbRegistry(() => setVersion((v) => v + 1));
  }, []);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = rt.player;
    if (!g.current) return;
    const st = useGame.getState();
    const vehicle = st.vehicles.find((v) => v.id === rt.driving);
    const inCarOrEscort =
      vehicle?.kind === "car" || vehicle?.kind === "supercar" || st.arrestStage?.kind === "escort";
    g.current.visible = !inCarOrEscort;
    const riderLift = vehicle?.kind === "moto" ? 0.38 : vehicle?.kind === "bike" ? 0.3 : 0;
    g.current.position.set(p.x, p.y + riderLift, p.z);
    g.current.rotation.set(0, p.heading, 0, "YXZ");
  });
  void version;
  if (!look) return null;
  const glbTpl = getCachedGlbWithFallback(gender === "male" ? "maleplayer" : "fplayer");
  return <group ref={g}>{glbTpl && <GlbPlayerModel tpl={glbTpl} />}</group>;
}

function World() {
  const [mobile, setMobile] = useState(isMobileViewport);
  const [ready] = useState(() => {
    const saved = useGame.getState();
    const activeInterior = saved.inside ? (saved.interior ?? "home") : null;
    Object.assign(rt.player, saved.position, {
      y: 0,
      speed: 0,
      act: null,
      sitY: 0,
      talkUntil: 0,
      exitPos: null,
    });
    rt.camYaw = saved.position.camYaw;
    rt.doorLocked = false;
    // Ensure any saved vehicles are cleanly snapped onto asphalt roads (never beach sand/water)
    if (saved.vehicles.some((v) => !onAsphaltRoad(v.x, v.z, 1.0))) {
      saved.patch({
        vehicles: saved.vehicles.map((v) =>
          onAsphaltRoad(v.x, v.z, 1.0)
            ? v
            : {
                ...v,
                x: Math.min(BEACH_X - 5, v.x),
                z: Math.round((v.z - 16) / 32) * 32 + 16,
              },
        ),
      });
    }
    if (activeInterior === "home") {
      const pos = saved.position;
      if (apartmentBlocked(pos.x, pos.z, 0.4, [], false, saved.house)) {
        rt.player.x = 0;
        rt.player.z = 2;
      }
      rt.interiorNpcs = [];
    } else if (activeInterior) {
      rt.interiorNpcs = createInteriorNpcs(activeInterior);
    } else {
      rt.interiorNpcs = [];
      resolveCollision(rt.player);
    }
    const hasUpgradedCrowd =
      saved.savedNpcs.length >= 130 && saved.savedNpcs.some((n) => n.role === "trampoline");
    rt.npcs = hasUpgradedCrowd
      ? saved.savedNpcs.map((n) => ({ ...n, talkUntil: n.talkUntil ?? 0 }))
      : createNpcs(rt.player.x, rt.player.z);
    rt.cars = createCars(32, rt.player.x, rt.player.z);
    const partner = useGame.getState().partner;
    const pn = partner ? rt.npcs[partner.id] : undefined;
    if (partner && pn) {
      pn.name = partner.name;
      pn.base = "follow";
      pn.mode = "follow";
      pn.x = rt.player.x - 2;
      pn.z = rt.player.z - 2;
    }
    return true;
  });

  const drag = useRef<{ x: number; id: number } | null>(null);
  const muted = useGame((s) => s.muted);
  const inside = useGame((s) => s.inside);
  const interior = useGame((s) => s.interior);
  const tryOn = useGame((s) => s.tryOn);
  const activeInterior = inside ? (interior ?? "home") : null;

  useEffect(() => {
    setMuted(muted);
    setVoiceMuted(muted);
  }, [muted]);

  useEffect(() => {
    const onResize = () => setMobile(isMobileViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      rt.keys.add(e.code);
      initAudio();
    };
    const up = (e: KeyboardEvent) => rt.keys.delete(e.code);
    const reset = () => {
      rt.keys.clear();
      rt.input.x = 0;
      rt.input.y = 0;
      saveNow();
    };
    const timer = window.setInterval(saveNow, AUTOSAVE_MS);
    window.addEventListener("blur", reset);
    window.addEventListener("pagehide", saveNow);
    const first = () => initAudio();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", first);
    if (import.meta.env.DEV)
      Object.assign(window, {
        __game: {
          get state() {
            return { ...useGame.getState(), player: { ...rt.player }, driving: rt.driving };
          },
          patch: useGame.getState().patch,
          teleport: (x: number, z: number) => {
            rt.player.x = x;
            rt.player.z = z;
          },
          enterApartment,
          leaveApartment,
          save: saveNow,
        },
      });
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", reset);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", first);
    };
  }, []);

  return (
    <div className="fixed inset-0 touch-none select-none overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, id: e.pointerId };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current?.id === e.pointerId) {
            if (tryOn) {
              rt.tryOnYaw -= (e.clientX - drag.current.x) * 0.012;
              drag.current.x = e.clientX;
            } else if (!inside && !rt.driving) {
              rt.camYaw -= (e.clientX - drag.current.x) * 0.007;
              drag.current.x = e.clientX;
            }
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {ready && (
          <Canvas
            frameloop={mobile ? "demand" : "always"}
            shadows={false}
            dpr={1}
            gl={{ powerPreference: "low-power", antialias: false }}
            onCreated={({ gl }) => {
              gl.setPixelRatio(1);
            }}
            camera={{
              fov: 74,
              near: 0.1,
              far: 400,
              position: inside ? [1.8, 13.8, 14.5] : [rt.player.x, 8.4, rt.player.z + 14.2],
            }}
          >
            <MobileFramePacer mobile={mobile} />
            <Stepper />
            <Lighting shadowEnabled={false} />
            {activeInterior === "home" ? (
              <Apartment />
            ) : activeInterior ? (
              <InteriorScene kind={activeInterior} />
            ) : (
              <>
                <City />
                <Landmarks />
                <Crowd />
                <Vehicles />
              </>
            )}
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
