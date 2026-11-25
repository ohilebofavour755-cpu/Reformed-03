import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { rt } from "@/game/runtime";

const daylight = (t: number) =>
  Math.max(0, Math.min(1, (Math.sin(((t - 6) / 12) * Math.PI) + 0.12) / 1.0));

const CLOUD_OFFSETS: [number, number, number, number][] = [
  [-65, 48, -75, 1.4],
  [-15, 54, -95, 1.7],
  [45, 50, -60, 1.3],
  [90, 56, -105, 1.9],
  [-85, 52, 40, 1.5],
  [65, 49, 65, 1.6],
  [10, 58, 95, 1.8],
];

function SkyClouds() {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.78,
        fog: false,
      }),
    [],
  );
  useFrame(() => {
    const inside = useGame.getState().inside;
    if (!ref.current) return;
    ref.current.visible = !inside;
    if (!inside) {
      ref.current.position.set(rt.player.x, 0, rt.player.z);
    }
  });
  return (
    <group ref={ref}>
      {CLOUD_OFFSETS.map(([cx, cy, cz, sc], idx) => (
        <group key={idx} position={[cx, cy, cz]} scale={sc}>
          <mesh position={[0, 0, 0]} scale={[7.5, 2.2, 4.2]} material={mat}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
          <mesh position={[-4.5, -0.3, 0.6]} scale={[4.8, 1.7, 3.3]} material={mat}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
          <mesh position={[4.6, -0.4, -0.5]} scale={[4.6, 1.6, 3.2]} material={mat}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Lighting({ shadowEnabled = false }: { shadowEnabled?: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();

  const c = useMemo(() => {
    const initialInside = useGame.getState().inside;
    const initColor = initialInside ? "#231b16" : "#8fc7ea";
    scene.background = new THREE.Color(initColor);
    scene.fog = new THREE.Fog(initColor, initialInside ? 26 : 90, initialInside ? 90 : 290);
    return {
      day: new THREE.Color("#8fc7ea"),
      dusk: new THREE.Color("#f08a5d"),
      night: new THREE.Color("#0d1733"),
      indoorHome: new THREE.Color("#231b16"),
      indoorClub: new THREE.Color("#140f1c"),
      indoorOther: new THREE.Color("#1e1a17"),
      tmp: new THREE.Color(),
      warm: new THREE.Color("#ffe2b8"),
      indoorWarm: new THREE.Color("#ffdcb3"),
      moon: new THREE.Color("#9fb4ff"),
    };
  }, [scene]);

  useFrame(() => {
    const st = useGame.getState();
    const t = st.time;
    const k = daylight(t);
    const fog = scene.fog as THREE.Fog;
    const bg = scene.background as THREE.Color;

    if (st.inside) {
      const targetBg =
        st.interior === "club"
          ? c.indoorClub
          : st.interior === "home" || !st.interior
            ? c.indoorHome
            : c.indoorOther;
      bg.copy(targetBg);
      fog.color.copy(targetBg);
      fog.near = 26;
      fog.far = 92;
      scene.environmentIntensity = st.interior === "club" ? 0.35 : 0.48;
      if (sun.current) {
        sun.current.position.set(2, 11, 8);
        sun.current.target.position.set(0, 0, 0);
        sun.current.target.updateMatrixWorld();
        sun.current.intensity = st.interior === "club" ? 0.45 : 0.9;
        sun.current.color.copy(c.indoorWarm);
      }
      if (hemi.current) hemi.current.intensity = st.interior === "club" ? 0.4 : 0.65;
      return;
    }

    const dusk = Math.max(0, 1 - Math.abs(k - 0.25) * 5);
    c.tmp
      .copy(c.night)
      .lerp(c.day, k)
      .lerp(c.dusk, dusk * 0.6);
    bg.copy(c.tmp);
    fog.color.copy(c.tmp);
    fog.near = 90;
    fog.far = 290;
    scene.environmentIntensity = 0.25 + k * 0.75;
    const p = rt.player;
    if (sun.current) {
      const a = ((t - 6) / 12) * Math.PI;
      sun.current.position.set(p.x + Math.cos(a) * 40, 10 + Math.abs(Math.sin(a)) * 50, p.z + 25);
      sun.current.target.position.set(p.x, 0, p.z);
      sun.current.target.updateMatrixWorld();
      sun.current.intensity = 0.25 + k * 2.4;
      sun.current.color.copy(k > 0.1 ? c.warm : c.moon);
    }
    if (hemi.current) hemi.current.intensity = 0.45 + k * 0.55;
    if (rt.mats.lamp) rt.mats.lamp.emissiveIntensity = k < 0.3 ? 3 : 0;
    if (rt.mats.windows) rt.mats.windows.emissiveIntensity = (1 - k) * 1.3;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#d8ecff", "#6b5236", 0.9]} />
      <directionalLight ref={sun} castShadow={shadowEnabled} />
      <SkyClouds />
      <Environment resolution={32} frames={1}>
        <Lightformer
          intensity={2}
          position={[0, 5, 0]}
          scale={[10, 10, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={1}
          color="#ffd9a8"
          position={[-5, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[20, 1, 1]}
        />
        <Lightformer
          intensity={1}
          color="#9cc9ff"
          position={[5, 1, 1]}
          rotation-y={-Math.PI / 2}
          scale={[20, 1, 1]}
        />
      </Environment>
    </>
  );
}
