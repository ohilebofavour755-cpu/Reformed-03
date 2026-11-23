import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { landmarkCenter, WATER_X } from "@/game/world";
import { signTexture } from "@/game/textures";
import { rt } from "@/game/runtime";

function Sign({ text, bg, fg, position, rotY = 0, w = 7 }: { text: string; bg: string; fg: string; position: [number, number, number]; rotY?: number; w?: number }) {
  const t = useMemo(() => signTexture(text, bg, fg), [text, bg, fg]);
  return (
    <mesh position={position} rotation-y={rotY}>
      <planeGeometry args={[w, w / 4]} />
      <meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.35} />
    </mesh>
  );
}
const Box = ({ p, s, c, r = 0.8, m = 0, cast = true }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; m?: number; cast?: boolean }) => (
  <mesh position={[p[0], p[1] + s[1] / 2, p[2]]} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} />
  </mesh>
);

function Home() {
  const { x, z } = landmarkCenter("home");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[16, 7, 16]} c="#efe2cc" />
      <mesh position={[0, 10, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[12.5, 6, 4]} />
        <meshStandardMaterial color="#a4462f" roughness={0.9} />
      </mesh>
      <Box p={[0, 0, 8.02]} s={[2.2, 3.4, 0.2]} c="#6b3d22" />
      <Box p={[-5, 2.5, 8.02]} s={[3, 2, 0.2]} c="#2c3a46" r={0.2} />
      <Box p={[5, 2.5, 8.02]} s={[3, 2, 0.2]} c="#2c3a46" r={0.2} />
      <Sign text="HOME" bg="#2f7d5b" fg="#fff6e0" position={[0, 4.6, 8.15]} w={5} />
    </group>
  );
}
function Market() {
  const { x, z } = landmarkCenter("market");
  const cols = ["#d94f30", "#f2c14e", "#2f7d5b", "#3a6ea5", "#e07a5f", "#8e3b63"];
  return (
    <group position={[x, 0, z]}>
      {cols.map((c, i) => {
        const sx = (i % 3 - 1) * 7, sz = (Math.floor(i / 3) - 0.5) * 9;
        return (
          <group key={i} position={[sx, 0, sz]}>
            <Box p={[0, 0, 0]} s={[4, 0.9, 2]} c="#8a5a3a" />
            <Box p={[0, 2.8, 0]} s={[5, 0.25, 3.2]} c={c} />
            {[-2.2, 2.2].map((px) => <Box key={px} p={[px, 0, 1.3]} s={[0.12, 2.8, 0.12]} c="#5a4632" />)}
            {[-1.2, -0.4, 0.4, 1.2].map((px, k) => (
              <mesh key={px} position={[px, 1.1, 0]} castShadow>
                <sphereGeometry args={[0.32, 10, 8]} />
                <meshStandardMaterial color={["#d4301f", "#f29b1d", "#3c9a3a", "#f5e3a0"][k] ?? "#fff"} />
              </mesh>
            ))}
          </group>
        );
      })}
      <Sign text="BALOGUN MARKET" bg="#f2c14e" fg="#3a1f10" position={[0, 5, 12]} w={10} />
      <Box p={[0, 0, 12]} s={[0.3, 4.2, 0.3]} c="#5a4632" />
    </group>
  );
}
function Boutique() {
  const { x, z } = landmarkCenter("boutique");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 9, 18]} c="#f0c6cf" />
      <Box p={[0, 0.5, 9.02]} s={[12, 4.5, 0.2]} c="#24303a" r={0.1} m={0.6} />
      <Sign text="ADA'S BOUTIQUE" bg="#8e3b63" fg="#ffe6ef" position={[0, 6.8, 9.2]} w={10} />
    </group>
  );
}
function Realtor() {
  const { x, z } = landmarkCenter("realtor");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 34, 18]} c="#6f8fb0" r={0.15} m={0.6} />
      <Box p={[0, 0, 9.02]} s={[4, 3.6, 0.2]} c="#dfe8f0" />
      <Sign text="PRIME REALTORS" bg="#1f3a5f" fg="#ffffff" position={[0, 5.2, 9.2]} w={10} />
    </group>
  );
}
function School() {
  const { x, z } = landmarkCenter("school");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, -2]} s={[18, 8, 13]} c="#f2c14e" />
      <Box p={[0, 8, -2]} s={[18.6, 0.6, 13.6]} c="#7a3b22" />
      <Box p={[-8, 0, 8]} s={[0.15, 7, 0.15]} c="#ddd" />
      <Box p={[-7.2, 6, 8]} s={[1.5, 0.9, 0.05]} c="#1f8a4c" />
      <Sign text="CITY HIGH SCHOOL" bg="#1f3a5f" fg="#ffd76a" position={[0, 6, 4.62]} w={10} />
    </group>
  );
}
function Church() {
  const { x, z } = landmarkCenter("church");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, -2]} s={[14, 10, 13]} c="#f5f1e8" />
      <Box p={[0, 0, 4]} s={[4.5, 17, 4.5]} c="#f5f1e8" />
      <mesh position={[0, 20, 4]} castShadow><coneGeometry args={[3.3, 6, 4]} /><meshStandardMaterial color="#5b6e85" /></mesh>
      <Box p={[0, 23, 4]} s={[0.3, 2.4, 0.3]} c="#d4a63a" m={0.8} r={0.3} />
      <Box p={[0, 24.2, 4]} s={[1.4, 0.3, 0.3]} c="#d4a63a" m={0.8} r={0.3} />
      <Box p={[0, 0, 6.27]} s={[2.4, 4, 0.1]} c="#6b3d22" />
      <Sign text="GRACE CATHEDRAL" bg="#5b6e85" fg="#fff" position={[0, 9.5, 6.35]} w={7} />
    </group>
  );
}
function Police() {
  const { x, z } = landmarkCenter("police");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 9, 18]} c="#e8edf2" />
      <Box p={[0, 9, 0]} s={[18.4, 1, 18.4]} c="#1d2b4f" />
      <Box p={[0, 0, 9.02]} s={[5, 3.8, 0.2]} c="#24303a" r={0.1} />
      <Sign text="POLICE STATION" bg="#1d2b4f" fg="#ffffff" position={[0, 5.8, 9.2]} w={10} />
    </group>
  );
}
function Club() {
  const { x, z } = landmarkCenter("club");
  const tiles = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color() }), []);
  useFrame(() => {
    const t = rt.t, im = tiles.current;
    if (im) {
      let i = 0;
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
        tmp.m.makeTranslation(-7.5 + a * 3, 0.06, -7.5 + b * 3); im.setMatrixAt(i, tmp.m);
        const beat = Math.floor(t * 1.88 + a * 0.5 + b * 0.3) % 4;
        im.setColorAt(i, tmp.c.setHSL([0.02, 0.12, 0.55, 0.85][beat]!, 0.8, (a + b + Math.floor(t * 3.76)) % 3 === 0 ? 0.55 : 0.2));
        i++;
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    if (light.current) { light.current.color.setHSL((t * 0.1) % 1, 0.8, 0.55); light.current.intensity = 40 + Math.abs(Math.sin(t * 3.7)) * 60; }
  });
  return (
    <group position={[x, 0, z]}>
      <instancedMesh ref={tiles} args={[undefined, undefined, 36]} frustumCulled={false}>
        <boxGeometry args={[2.9, 0.1, 2.9]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} roughness={0.3} />
      </instancedMesh>
      <Box p={[11, 0, 0]} s={[4, 1.4, 12]} c="#1b1b22" />
      <Box p={[11.5, 1.4, -5]} s={[1.6, 3, 1.6]} c="#0f0f14" />
      <Box p={[11.5, 1.4, 5]} s={[1.6, 3, 1.6]} c="#0f0f14" />
      <Box p={[10.5, 1.4, 0]} s={[1.2, 1, 3]} c="#3a3a48" m={0.6} />
      <Box p={[0, 0, -11.5]} s={[24, 2.4, 0.5]} c="#24202c" />
      <Box p={[0, 0, 11.5]} s={[24, 2.4, 0.5]} c="#24202c" />
      <Box p={[-11.5, 0, -7]} s={[0.5, 2.4, 9]} c="#24202c" />
      <Box p={[-11.5, 0, 7]} s={[0.5, 2.4, 9]} c="#24202c" />
      <Box p={[-11.5, 2.4, 0]} s={[0.6, 2.6, 6]} c="#24202c" />
      <Sign text="CLUB AMAPIANO" bg="#120d1c" fg="#ffb347" position={[-11.85, 3.7, 0]} rotY={-Math.PI / 2} w={6} />
      <pointLight ref={light} position={[0, 7, 0]} distance={26} decay={1.5} />
    </group>
  );
}
function Chill() {
  const { x, z } = landmarkCenter("chill");
  const cols = ["#e8544b", "#f2c14e", "#3fa7b5", "#f5f0e6", "#e07a5f"];
  return (
    <group position={[x, 0, z]}>
      {cols.map((c, i) => (
        <group key={i} position={[10, 0, -10 + i * 5]}>
          <Box p={[0, 0, 0]} s={[0.08, 2.6, 0.08]} c="#ddd" />
          <mesh position={[0, 2.7, 0]} castShadow><coneGeometry args={[1.9, 0.8, 12]} /><meshStandardMaterial color={c} /></mesh>
          <Box p={[1.4, 0, 0]} s={[0.9, 0.35, 2]} c="#f5f0e6" />
        </group>
      ))}
      <Box p={[-4, 0, 0]} s={[5, 2.6, 3]} c="#8a5a3a" />
      <mesh position={[-4, 4, 0]} castShadow><coneGeometry args={[4, 2.6, 6]} /><meshStandardMaterial color="#c9a45a" roughness={1} /></mesh>
      <Sign text="CHILL SPOT" bg="#3fa7b5" fg="#fff" position={[-4, 2.2, 1.55]} w={4} />
      <mesh position={[WATER_X - x + 25, -0.2, 0]}><sphereGeometry args={[0.5, 8, 6]} /><meshStandardMaterial color="#e8544b" /></mesh>
    </group>
  );
}

export function Landmarks() {
  return (<><Home /><Market /><Boutique /><Realtor /><School /><Church /><Police /><Club /><Chill /></>);
}
