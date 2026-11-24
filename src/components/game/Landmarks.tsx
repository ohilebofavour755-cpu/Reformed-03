import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  landmarkCenter,
  WATER_X,
  PUBLIC_RESTROOM,
  insidePublicRestroom,
  publicRestroomDoorShouldOpen,
} from "@/game/world";
import { signTexture } from "@/game/textures";
import { sharedMat, getUnitBoxBottom, getUnitBoxCenter, getUnitSphere } from "@/game/materials";
import { rt } from "@/game/runtime";

function Sign({
  text,
  bg,
  fg,
  position,
  rotY = 0,
  w = 7,
}: {
  text: string;
  bg: string;
  fg: string;
  position: [number, number, number];
  rotY?: number;
  w?: number;
}) {
  const t = useMemo(() => signTexture(text, bg, fg), [text, bg, fg]);
  return (
    <mesh position={position} rotation-y={rotY}>
      <planeGeometry args={[w, w / 4]} />
      <meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.35} />
    </mesh>
  );
}

const Box = ({
  p,
  s,
  c,
  r = 0.8,
  m = 0,
  emissive,
  emissiveIntensity = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
  m?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) => (
  <mesh
    position={p}
    scale={s}
    geometry={getUnitBoxBottom()}
    material={sharedMat(c, r, m, emissive, emissiveIntensity)}
  />
);

function EntranceDoor({
  p,
  rotY = 0,
  frame = "#3a281d",
  door = "#6b3d22",
}: {
  p: [number, number, number];
  rotY?: number;
  frame?: string;
  door?: string;
}) {
  return (
    <group position={p} rotation-y={rotY}>
      <Box p={[0, 0, 0]} s={[2.4, 3.2, 0.24]} c={frame} r={0.5} />
      <Box p={[0, 0.05, 0.06]} s={[2.0, 2.9, 0.16]} c={door} r={0.45} />
      <Box p={[0.72, 1.35, 0.17]} s={[0.12, 0.35, 0.08]} c="#e0b85c" m={0.8} r={0.25} />
      <Box
        p={[0, 3.35, 0.45]}
        s={[3.0, 0.22, 1.0]}
        c="#2f7d5b"
        emissive="#ffd27a"
        emissiveIntensity={0.12}
      />
    </group>
  );
}

function Home() {
  const { x, z } = landmarkCenter("home");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[16, 7, 16]} c="#efe2cc" />
      <mesh position={[0, 10, 0]} rotation-y={Math.PI / 4} material={sharedMat("#a4462f", 0.9)}>
        <coneGeometry args={[12.5, 6, 4]} />
      </mesh>
      <EntranceDoor p={[0, 0, 8.02]} />
      <Box p={[-5, 2.5, 8.02]} s={[3, 2, 0.2]} c="#2c3a46" r={0.2} />
      <Box p={[5, 2.5, 8.02]} s={[3, 2, 0.2]} c="#2c3a46" r={0.2} />
      <Sign text="HOME" bg="#2f7d5b" fg="#fff6e0" position={[0, 5.1, 8.15]} w={5} />
    </group>
  );
}

function Market() {
  const { x, z } = landmarkCenter("market");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 7.5, 16]} c="#f2e4c9" />
      <Box p={[0, 7.5, 0]} s={[18.6, 0.6, 16.6]} c="#d94f30" />
      {/* Storefront display windows & striped awning */}
      <Box p={[-5.2, 0.9, 8.02]} s={[5.2, 3.0, 0.16]} c="#2a4052" r={0.15} m={0.5} />
      <Box p={[5.2, 0.9, 8.02]} s={[5.2, 3.0, 0.16]} c="#2a4052" r={0.15} m={0.5} />
      <Box p={[0, 3.9, 8.5]} s={[16.5, 0.3, 1.4]} c="#f2c14e" />
      <EntranceDoor p={[0, 0, 8.04]} frame="#2d4a3e" door="#2f7d5b" />
      <Sign text="BALOGUN MARKET" bg="#f2c14e" fg="#3a1f10" position={[0, 5.7, 8.16]} w={10} />
    </group>
  );
}

function Boutique() {
  const { x, z } = landmarkCenter("boutique");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 9, 18]} c="#f0c6cf" />
      <Box p={[0, 9, 0]} s={[18.5, 0.5, 18.5]} c="#8e3b63" />
      <Box p={[-5.2, 0.8, 9.02]} s={[4.8, 3.4, 0.18]} c="#24303a" r={0.1} m={0.6} />
      <Box p={[5.2, 0.8, 9.02]} s={[4.8, 3.4, 0.18]} c="#24303a" r={0.1} m={0.6} />
      <EntranceDoor p={[0, 0, 9.04]} frame="#8e3b63" door="#5a2440" />
      <Sign text="ADA'S BOUTIQUE" bg="#8e3b63" fg="#ffe6ef" position={[0, 6.8, 9.2]} w={10} />
    </group>
  );
}

function InkStudio() {
  const { x, z } = landmarkCenter("ink");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 8.5, 18]} c="#262832" r={0.85} />
      <Box p={[0, 8.5, 0]} s={[18.6, 0.55, 18.6]} c="#16171d" />
      <Box
        p={[0, 4.4, 9.05]}
        s={[14, 0.16, 0.12]}
        c="#ff4d94"
        emissive="#ff4d94"
        emissiveIntensity={0.9}
      />
      <Box p={[-5.2, 0.8, 9.02]} s={[4.5, 3.2, 0.18]} c="#18202c" r={0.15} m={0.5} />
      <Box p={[5.2, 0.8, 9.02]} s={[4.5, 3.2, 0.18]} c="#18202c" r={0.15} m={0.5} />
      <EntranceDoor p={[0, 0, 9.04]} frame="#ff4d94" door="#15171e" />
      <Sign text="INK STUDIO" bg="#14131c" fg="#ff66b2" position={[0, 6.5, 9.2]} w={8.5} />
    </group>
  );
}

function Realtor() {
  const { x, z } = landmarkCenter("realtor");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 34, 18]} c="#6f8fb0" r={0.15} m={0.6} />
      <EntranceDoor p={[0, 0, 9.04]} frame="#1f3a5f" door="#dfe8f0" />
      <Sign text="PRIME REALTORS" bg="#1f3a5f" fg="#ffffff" position={[0, 5.4, 9.2]} w={10} />
    </group>
  );
}

function School() {
  const { x, z } = landmarkCenter("school");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, -2]} s={[18, 8, 13]} c="#f2c14e" />
      <Box p={[0, 8, -2]} s={[18.6, 0.6, 13.6]} c="#7a3b22" />
      <Box p={[-8, 0, 8]} s={[0.15, 7, 0.15]} c="#dddddd" />
      <Box p={[-7.2, 6, 8]} s={[1.5, 0.9, 0.05]} c="#1f8a4c" />
      <EntranceDoor p={[0, 0, 4.54]} frame="#7a3b22" door="#4e2a1b" />
      <Sign text="CITY HIGH SCHOOL" bg="#1f3a5f" fg="#ffd76a" position={[0, 6.1, 4.62]} w={10} />
    </group>
  );
}

function Church() {
  const { x, z } = landmarkCenter("church");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, -2]} s={[14, 10, 13]} c="#f5f1e8" />
      <Box p={[0, 0, 4]} s={[4.5, 17, 4.5]} c="#f5f1e8" />
      <mesh position={[0, 20, 4]} material={sharedMat("#5b6e85")}>
        <coneGeometry args={[3.3, 6, 4]} />
      </mesh>
      <Box p={[0, 23, 4]} s={[0.3, 2.4, 0.3]} c="#d4a63a" m={0.8} r={0.3} />
      <Box p={[0, 24.2, 4]} s={[1.4, 0.3, 0.3]} c="#d4a63a" m={0.8} r={0.3} />
      <EntranceDoor p={[0, 0, 6.27]} frame="#5b6e85" door="#6b3d22" />
      <Sign text="GRACE CATHEDRAL" bg="#5b6e85" fg="#ffffff" position={[0, 9.5, 6.35]} w={7} />
    </group>
  );
}

function Police() {
  const { x, z } = landmarkCenter("police");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[18, 9, 18]} c="#e8edf2" />
      <Box p={[0, 9, 0]} s={[18.4, 1, 18.4]} c="#1d2b4f" />
      <EntranceDoor p={[0, 0, 9.04]} frame="#1d2b4f" door="#24303a" />
      <Sign text="POLICE STATION" bg="#1d2b4f" fg="#ffffff" position={[0, 5.8, 9.2]} w={10} />
    </group>
  );
}

function Dealer() {
  const { x, z } = landmarkCenter("dealer");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, -1]} s={[18, 7.5, 14]} c="#dce4ec" r={0.3} m={0.2} />
      <Box p={[0, 7.5, -1]} s={[18.6, 0.6, 14.6]} c="#c44536" />
      <Box p={[-5.2, 0.7, 6.02]} s={[5.2, 3.6, 0.16]} c="#223548" r={0.1} m={0.6} />
      <Box p={[5.2, 0.7, 6.02]} s={[5.2, 3.6, 0.16]} c="#223548" r={0.1} m={0.6} />
      <EntranceDoor p={[0, 0, 6.04]} frame="#c44536" door="#24303a" />
      <Sign text="CITY MOTORS" bg="#c44536" fg="#ffffff" position={[0, 5.8, 6.18]} w={8.5} />
    </group>
  );
}

function Club() {
  const { x, z } = landmarkCenter("club");
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0, 0]} s={[23, 8, 23]} c="#1c1824" r={0.75} />
      <Box p={[0, 8, 0]} s={[23.6, 0.7, 23.6]} c="#120d1c" />
      <Box
        p={[-11.55, 4.1, 0]}
        s={[0.14, 0.2, 18]}
        c="#ff9f43"
        emissive="#ff9f43"
        emissiveIntensity={0.85}
      />
      <EntranceDoor p={[-11.54, 0, 0]} rotY={-Math.PI / 2} frame="#ff9f43" door="#15121d" />
      {/* Velvet VIP poles outside entrance */}
      <Box p={[-12.6, 0, -1.8]} s={[0.12, 1.0, 0.12]} c="#e0b85c" m={0.8} r={0.2} />
      <Box p={[-12.6, 0, 1.8]} s={[0.12, 1.0, 0.12]} c="#e0b85c" m={0.8} r={0.2} />
      <Sign
        text="CLUB AMAPIANO"
        bg="#120d1c"
        fg="#ffb347"
        position={[-11.65, 5.8, 0]}
        rotY={-Math.PI / 2}
        w={9}
      />
    </group>
  );
}

function PublicRestroom() {
  const hingeRef = useRef<THREE.Group>(null);
  const angle = useRef(0);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const open = publicRestroomDoorShouldOpen(rt.player.x, rt.player.z, rt.doorLocked);
    const target = open ? -Math.PI * 0.48 : 0;
    angle.current += (target - angle.current) * Math.min(1, dt * 10);
    if (hingeRef.current) hingeRef.current.rotation.y = angle.current;
  });

  const inRoom = insidePublicRestroom(rt.player.x, rt.player.z);
  const lockColor = rt.doorLocked ? "#d94f30" : inRoom ? "#f2c14e" : "#2f7d5b";
  const doorW = PUBLIC_RESTROOM.doorHalfW * 2;

  return (
    <group position={[PUBLIC_RESTROOM.x, 0, PUBLIC_RESTROOM.z]}>
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PUBLIC_RESTROOM.hx * 2, PUBLIC_RESTROOM.hz * 2]} />
        <meshStandardMaterial color="#d2e4e6" roughness={0.35} />
      </mesh>
      <Box
        p={[0, 0, -PUBLIC_RESTROOM.hz]}
        s={[PUBLIC_RESTROOM.hx * 2 + 0.3, 3.1, 0.25]}
        c="#e8eceb"
      />
      <Box p={[-PUBLIC_RESTROOM.hx, 0, 0]} s={[0.25, 3.1, PUBLIC_RESTROOM.hz * 2]} c="#e8eceb" />
      <Box p={[PUBLIC_RESTROOM.hx, 0, 0]} s={[0.25, 3.1, PUBLIC_RESTROOM.hz * 2]} c="#e8eceb" />
      <Box
        p={[-(PUBLIC_RESTROOM.hx + PUBLIC_RESTROOM.doorHalfW) / 2, 0, PUBLIC_RESTROOM.hz]}
        s={[PUBLIC_RESTROOM.hx - PUBLIC_RESTROOM.doorHalfW, 3.1, 0.25]}
        c="#e8eceb"
      />
      <Box
        p={[(PUBLIC_RESTROOM.hx + PUBLIC_RESTROOM.doorHalfW) / 2, 0, PUBLIC_RESTROOM.hz]}
        s={[PUBLIC_RESTROOM.hx - PUBLIC_RESTROOM.doorHalfW, 3.1, 0.25]}
        c="#e8eceb"
      />
      <Box p={[0, 2.3, PUBLIC_RESTROOM.hz]} s={[doorW, 0.8, 0.25]} c="#e8eceb" />
      <Box
        p={[0, 3.1, 0]}
        s={[PUBLIC_RESTROOM.hx * 2 + 0.6, 0.3, PUBLIC_RESTROOM.hz * 2 + 0.6]}
        c="#3fa7b5"
      />
      <Sign
        text="RESTROOMS"
        bg="#1d3557"
        fg="#ffffff"
        position={[0, 2.65, PUBLIC_RESTROOM.hz + 0.18]}
        w={4.4}
      />

      <Box p={[0, 0, -1.6]} s={[0.16, 2.2, 2.0]} c="#b8c9cc" />
      {[-1.8, 1.8].map((sx) => (
        <group key={sx} position={[sx, 0, -1.3]}>
          <Box p={[0, 0, 0]} s={[0.62, 0.45, 0.68]} c="#ffffff" r={0.2} />
          <Box p={[0, 0.45, -0.22]} s={[0.56, 0.48, 0.22]} c="#f5f8fa" r={0.2} />
        </group>
      ))}
      <Box p={[2.45, 0, 0.8]} s={[0.65, 0.82, 0.9]} c="#ffffff" r={0.3} />
      <Box p={[2.75, 1.2, 0.8]} s={[0.05, 0.85, 0.7]} c="#b8d4e3" m={0.8} r={0.1} />

      <group ref={hingeRef} position={[-PUBLIC_RESTROOM.doorHalfW, 0, PUBLIC_RESTROOM.hz]}>
        <mesh
          position={[doorW / 2, 1.15, 0]}
          scale={[doorW, 2.3, 0.1]}
          geometry={getUnitBoxCenter()}
          material={sharedMat("#3a6e7c", 0.6)}
        />
        <mesh
          position={[doorW - 0.22, 1.05, 0.07]}
          scale={[0.12, 0.08, 0.06]}
          geometry={getUnitBoxCenter()}
          material={sharedMat("#e0b85c", 0.3, 0.8)}
        />
        <mesh
          position={[doorW - 0.22, 1.28, -0.07]}
          scale={[0.08, 0.08, 0.05]}
          geometry={getUnitBoxCenter()}
          material={sharedMat(lockColor, 0.4, 0.2, lockColor, 0.6)}
        />
      </group>
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
          <Box p={[0, 0, 0]} s={[0.08, 2.6, 0.08]} c="#dddddd" />
          <mesh position={[0, 2.7, 0]} material={sharedMat(c)}>
            <coneGeometry args={[1.9, 0.8, 12]} />
          </mesh>
          <Box p={[1.4, 0, 0]} s={[2.0, 0.32, 0.95]} c="#b6895b" r={0.8} />
          <Box p={[1.4, 0.32, 0]} s={[1.85, 0.1, 0.84]} c="#f5f0e6" r={0.95} />
          <Box p={[0.65, 0.42, 0]} s={[0.4, 0.25, 0.82]} c={c} r={0.9} />
        </group>
      ))}
      <Box p={[-4, 0, 0]} s={[5, 2.6, 3]} c="#8a5a3a" />
      <mesh position={[-4, 4, 0]} material={sharedMat("#c9a45a", 1)}>
        <coneGeometry args={[4, 2.6, 6]} />
      </mesh>
      <Sign text="CHILL SPOT" bg="#3fa7b5" fg="#ffffff" position={[-4, 2.2, 1.55]} w={4} />
      {[-3.2, 3.2].map((bz, i) => (
        <group key={i} position={[-4, 0, bz]}>
          <Box p={[0, 0, 0]} s={[2.1, 0.42, 0.72]} c="#7c5032" r={0.75} />
          <Box p={[0, 0.42, 0]} s={[1.95, 0.08, 0.62]} c="#f2e6d0" r={0.9} />
        </group>
      ))}
      <mesh
        position={[WATER_X - x + 25, -0.2, 0]}
        scale={1}
        geometry={getUnitSphere()}
        material={sharedMat("#e8544b")}
      />
    </group>
  );
}

export function Landmarks() {
  return (
    <>
      <Home />
      <Market />
      <Boutique />
      <InkStudio />
      <Realtor />
      <School />
      <Church />
      <Police />
      <Dealer />
      <Club />
      <PublicRestroom />
      <Chill />
    </>
  );
}
