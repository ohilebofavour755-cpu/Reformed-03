import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { sharedMat, getUnitBoxBottom, getUnitSphere } from "@/game/materials";
import { signTexture } from "@/game/textures";
import { INTERIORS, POLICE_CELL, type BuildingKind } from "@/game/sim/interiors";
import { OUTFITS, NAIL_COLORS } from "@/game/catalog";
import { rt } from "@/game/runtime";
import { Crowd } from "./Crowd";
import { Model } from "./Model";

const Box = ({
  p,
  s,
  c,
  r = 0.78,
  m = 0,
  emissive,
  emissiveIntensity = 0,
  rotY = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
  m?: number;
  emissive?: string;
  emissiveIntensity?: number;
  rotY?: number;
}) => (
  <mesh
    position={p}
    scale={s}
    rotation-y={rotY}
    geometry={getUnitBoxBottom()}
    material={sharedMat(c, r, m, emissive, emissiveIntensity)}
  />
);

function WallSign({
  text,
  bg,
  fg,
  p,
  w = 4,
  rotY = 0,
}: {
  text: string;
  bg: string;
  fg: string;
  p: [number, number, number];
  w?: number;
  rotY?: number;
}) {
  const t = useMemo(() => signTexture(text, bg, fg), [text, bg, fg]);
  return (
    <mesh position={p} rotation-y={rotY}>
      <planeGeometry args={[w, w / 4]} />
      <meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.35} />
    </mesh>
  );
}

function RoomShell({
  hx,
  hz,
  floorColor,
  wallColor,
  accent,
  doorX,
  doorZ,
}: {
  hx: number;
  hz: number;
  floorColor: string;
  wallColor: string;
  accent: string;
  doorX: number;
  doorZ: number;
}) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshStandardMaterial color={floorColor} roughness={0.75} />
      </mesh>
      <Box p={[0, 0, -hz]} s={[hx * 2 + 0.3, 3.4, 0.22]} c={wallColor} />
      <Box p={[-hx, 0, 0]} s={[0.22, 3.4, hz * 2]} c={wallColor} />
      <Box p={[hx, 0, 0]} s={[0.22, 0.35, hz * 2]} c={wallColor} />
      <Box p={[0, 0, hz]} s={[hx * 2, 0.25, 0.22]} c={wallColor} />
      <mesh position={[doorX, 0.015, doorZ]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshStandardMaterial color={accent} roughness={0.95} />
      </mesh>
      <hemisphereLight args={["#fff4e4", "#6e5c4a", 0.9]} />
      <pointLight position={[0, 3.8, -0.5]} intensity={16} distance={26} color="#fff1dc" />
    </>
  );
}

function MarketInterior() {
  const spec = INTERIORS.market;
  const fruits = ["#d9381e", "#f4a261", "#3a9a43", "#f2c14e"];
  const bottles = ["#e63946", "#2a9d8f", "#e9c46a", "#457b9d"];
  return (
    <group>
      <RoomShell
        hx={spec.hx}
        hz={spec.hz}
        floorColor="#dfd7cb"
        wallColor="#f7efe3"
        accent="#2f7d5b"
        doorX={spec.door.x}
        doorZ={spec.door.z}
      />
      <WallSign text="BALOGUN SUPERMARKET" bg="#f2c14e" fg="#3a1f10" p={[0, 2.5, -6.82]} w={6.2} />

      {/* West Aisle: Produce & Jollof Ingredients */}
      <Box p={[-4.8, 0, -2.0]} s={[2.6, 0.95, 5.2]} c="#8a5a3a" />
      <Box p={[-4.8, 0.95, -2.0]} s={[2.4, 0.14, 5.0]} c="#c99e6b" />
      {[-3.8, -2.6, -1.4, -0.2].map((pz, i) => (
        <mesh
          key={pz}
          position={[-4.8, 1.25, pz]}
          scale={0.55}
          geometry={getUnitSphere()}
          material={sharedMat(fruits[i % fruits.length]!)}
        />
      ))}
      <WallSign
        text="PRODUCE & INGREDIENTS"
        bg="#2f7d5b"
        fg="#ffffff"
        p={[-4.8, 2.2, -4.4]}
        w={3.0}
      />

      {/* North Hot Grill Counter: Puff-Puff & Suya */}
      <Box p={[-1.2, 0, -4.8]} s={[4.2, 1.05, 1.5]} c="#4c3326" />
      <Box p={[-1.2, 1.05, -4.8]} s={[4.3, 0.1, 1.6]} c="#d4d7dd" m={0.3} r={0.3} />
      <Box
        p={[-2.1, 1.16, -4.8]}
        s={[1.1, 0.14, 0.8]}
        c="#e07a5f"
        emissive="#d94f30"
        emissiveIntensity={0.4}
      />
      <Box p={[-0.2, 1.16, -4.8]} s={[1.1, 0.14, 0.8]} c="#f2c14e" />
      <WallSign text="SUYA & PUFF-PUFF" bg="#c9412b" fg="#fff5e0" p={[-1.2, 2.3, -5.5]} w={3.6} />

      {/* East Aisle: Chilled Drinks & Home Essentials */}
      <Box p={[4.8, 0, -2.0]} s={[2.6, 2.1, 5.2]} c="#2d4c63" r={0.4} />
      {[-3.8, -2.5, -1.2, 0.1].map((pz, i) => (
        <Box
          key={pz}
          p={[4.1, 1.3, pz]}
          s={[0.26, 0.52, 0.7]}
          c={bottles[i % bottles.length]!}
          r={0.2}
        />
      ))}
      <WallSign text="DRINKS & HOME CARE" bg="#1f3a5f" fg="#ffffff" p={[4.8, 2.5, -4.4]} w={3.0} />

      {/* Checkout Counter */}
      <Box p={[4.0, 0, 3.4]} s={[3.6, 1.05, 1.2]} c="#325e4d" />
      <Box p={[3.3, 1.05, 3.4]} s={[0.6, 0.35, 0.5]} c="#1d232a" />
      <WallSign text="CHECKOUT" bg="#2f7d5b" fg="#ffffff" p={[4.0, 2.1, 2.8]} w={2.5} />
    </group>
  );
}

function BoutiqueInterior() {
  const spec = INTERIORS.boutique;
  return (
    <group>
      <RoomShell
        hx={spec.hx}
        hz={spec.hz}
        floorColor="#ead7dc"
        wallColor="#f7eaee"
        accent="#8e3b63"
        doorX={spec.door.x}
        doorZ={spec.door.z}
      />
      <WallSign
        text="ADA BOUTIQUE & SALON"
        bg="#8e3b63"
        fg="#ffe6ef"
        p={[0, 2.75, -6.32]}
        w={6.2}
      />

      {/* Central Full-Length Mirror & Raised Try-On Platform */}
      <mesh position={[0, 0.04, -1.7]} receiveShadow={false}>
        <cylinderGeometry args={[1.45, 1.55, 0.08, 24]} />
        <meshStandardMaterial color="#c995a8" roughness={0.4} />
      </mesh>
      <Box p={[0, 0, -4.3]} s={[3.2, 2.9, 0.25]} c="#4c2d3b" r={0.5} />
      <Box p={[0, 0.18, -4.16]} s={[2.8, 2.55, 0.05]} c="#c9e2ef" m={0.9} r={0.08} />
      <WallSign text="MIRROR PLATFORM" bg="#5a2440" fg="#ffe6ef" p={[0, 2.7, -4.08]} w={3.0} />

      {/* West Clothing Racks */}
      {[-1.8, 1.7].map((rz, idx) => (
        <group key={rz} position={[-5.2, 0, rz]}>
          <Box p={[0, 0, 0]} s={[1.8, 0.12, 2.3]} c="#3c2f37" />
          <Box p={[0, 0.12, -1.0]} s={[0.1, 1.65, 0.1]} c="#d4af37" m={0.8} r={0.2} />
          <Box p={[0, 0.12, 1.0]} s={[0.1, 1.65, 0.1]} c="#d4af37" m={0.8} r={0.2} />
          <Box p={[0, 1.72, 0]} s={[0.08, 0.08, 2.1]} c="#d4af37" m={0.8} r={0.2} />
          {OUTFITS.slice(idx * 2, idx * 2 + 3).map((o, k) => (
            <Box key={o.id} p={[0, 0.9, -0.65 + k * 0.65]} s={[0.38, 0.82, 0.45]} c={o.shirt} />
          ))}
        </group>
      ))}
      <WallSign
        text="OUTFIT RACKS"
        bg="#8e3b63"
        fg="#ffffff"
        p={[-5.2, 2.3, 0]}
        rotY={Math.PI / 2}
        w={3.0}
      />

      {/* NE Hair Styling Station */}
      <group position={[5.1, 0, -2.4]}>
        <Box p={[0, 0, 0]} s={[1.8, 0.9, 1.7]} c="#4e2e3d" />
        <Box p={[0.6, 0.9, 0]} s={[0.15, 1.3, 1.3]} c="#b8d4e3" m={0.85} r={0.1} />
        <Box p={[-0.6, 0, 0]} s={[0.65, 0.55, 0.65]} c="#e07a5f" />
      </group>
      <WallSign
        text="HAIR SALON"
        bg="#3b2230"
        fg="#ffdce8"
        p={[5.1, 2.3, -2.4]}
        rotY={-Math.PI / 2}
        w={2.6}
      />

      {/* SE Nail Manicure Station */}
      <group position={[5.1, 0, 1.8]}>
        <Box p={[0, 0, 0]} s={[1.6, 0.82, 1.6]} c="#f9f3f5" r={0.3} />
        {NAIL_COLORS.slice(1).map((n, i) => (
          <Box
            key={n.id}
            p={[-0.4 + i * 0.2, 0.84, -0.4]}
            s={[0.12, 0.24, 0.12]}
            c={n.color}
            r={0.15}
          />
        ))}
      </group>
      <WallSign
        text="NAIL STATION"
        bg="#d90429"
        fg="#ffffff"
        p={[5.1, 2.2, 1.8]}
        rotY={-Math.PI / 2}
        w={2.6}
      />
    </group>
  );
}

function InkInterior() {
  const spec = INTERIORS.ink;
  const flash = ["#ff4d94", "#4cc9f0", "#f77f00", "#ffd166"];
  return (
    <group>
      <RoomShell
        hx={spec.hx}
        hz={spec.hz}
        floorColor="#2e292e"
        wallColor="#1e1c24"
        accent="#ff4d94"
        doorX={spec.door.x}
        doorZ={spec.door.z}
      />
      <WallSign text="INK STUDIO" bg="#14131c" fg="#ff66b2" p={[0, 2.65, -5.82]} w={4.8} />

      {/* Flash Art Wall & Tattoo Chair */}
      <Box p={[0, 0, -4.2]} s={[4.2, 2.4, 0.3]} c="#15141a" />
      {flash.map((c, i) => (
        <Box
          key={i}
          p={[-1.35 + i * 0.9, 1.2, -4.02]}
          s={[0.7, 0.95, 0.06]}
          c={c}
          emissive={c}
          emissiveIntensity={0.25}
        />
      ))}
      <Box p={[0, 0, -2.1]} s={[1.1, 0.55, 1.5]} c="#141418" />
      <Box p={[0, 0.55, -2.5]} s={[0.9, 0.7, 0.35]} c="#8e2444" />

      {/* Artist Supply Desk */}
      <Box p={[-4.4, 0, -1.8]} s={[1.6, 0.92, 2.4]} c="#2f2a35" />
      <Box
        p={[-4.2, 0.92, -1.8]}
        s={[0.8, 0.25, 1.2]}
        c="#4cc9f0"
        emissive="#4cc9f0"
        emissiveIntensity={0.3}
      />

      {/* Waiting Lounge Bench */}
      <Box p={[4.6, 0, 1.2]} s={[1.1, 0.48, 2.4]} c="#3d2b38" />
    </group>
  );
}

function ClubInterior() {
  const spec = INTERIORS.club;
  const tiles = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color() }), []);
  const bottles = ["#f25c54", "#ffd166", "#06d6a0", "#4cc9f0", "#f77f00", "#c77dff"];

  useFrame(() => {
    const t = rt.t;
    const im = tiles.current;
    if (im) {
      let i = 0;
      for (let a = 0; a < 5; a++)
        for (let b = 0; b < 5; b++) {
          tmp.m.makeTranslation(-5.6 + a * 2.8, 0.04, -4.2 + b * 2.6);
          im.setMatrixAt(i, tmp.m);
          const beat = Math.floor(t * 1.88 + a * 0.5 + b * 0.3) % 4;
          im.setColorAt(
            i,
            tmp.c.setHSL(
              [0.02, 0.12, 0.55, 0.85][beat]!,
              0.8,
              (a + b + Math.floor(t * 3.76)) % 3 === 0 ? 0.55 : 0.22,
            ),
          );
          i++;
        }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    if (light.current) {
      light.current.color.setHSL((t * 0.1) % 1, 0.85, 0.55);
      light.current.intensity = 28 + Math.abs(Math.sin(t * 3.7)) * 30;
    }
  });

  return (
    <group>
      <RoomShell
        hx={spec.hx}
        hz={spec.hz}
        floorColor="#16141d"
        wallColor="#24202c"
        accent="#ff9f43"
        doorX={spec.door.x}
        doorZ={spec.door.z}
      />
      <pointLight ref={light} position={[0, 4.8, 0]} distance={24} decay={1.5} />
      <instancedMesh ref={tiles} args={[undefined, undefined, 25]} frustumCulled={false}>
        <boxGeometry args={[2.5, 0.08, 2.3]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.3}
          roughness={0.3}
        />
      </instancedMesh>

      {/* DJ Stage */}
      <Box p={[9.2, 0, 0]} s={[2.6, 1.2, 10]} c="#181620" />
      <Box p={[9.4, 1.2, -3.8]} s={[1.4, 2.2, 1.4]} c="#0f0e14" />
      <Box p={[9.4, 1.2, 3.8]} s={[1.4, 2.2, 1.4]} c="#0f0e14" />
      <Box p={[8.8, 1.2, 0]} s={[1.0, 0.85, 2.8]} c="#3a3a48" m={0.6} />

      {/* Physical Walk-Up Amapiano Bar Counter */}
      <Box p={[0, 0, -8.5]} s={[8.0, 1.05, 1.1]} c="#2d1e18" r={0.5} />
      <Box p={[0, 1.05, -8.5]} s={[8.2, 0.12, 1.3]} c="#d4d7dd" r={0.25} m={0.2} />
      <Box
        p={[0, 0.25, -7.92]}
        s={[7.8, 0.12, 0.08]}
        c="#ff9f43"
        emissive="#ff9f43"
        emissiveIntensity={1.1}
      />
      <WallSign text="AMAPIANO BAR" bg="#140c1c" fg="#ffcb6b" p={[0, 2.6, -10.25]} w={5.0} />
      <Box p={[0, 0, -10.1]} s={[6.4, 2.1, 0.4]} c="#1d1826" r={0.6} />
      {Array.from({ length: 12 }, (_, i) => (
        <Box
          key={i}
          p={[-2.7 + i * 0.49, 1.25, -10.05]}
          s={[0.14, 0.42, 0.14]}
          c={bottles[i % bottles.length]!}
          r={0.15}
          emissive={bottles[i % bottles.length]!}
          emissiveIntensity={0.35}
        />
      ))}
      {[-2.4, -0.8, 0.8, 2.4].map((lx, i) => (
        <group key={i} position={[lx, 0, -7.2]}>
          <Box p={[0, 0, 0]} s={[0.1, 0.56, 0.1]} c="#8a929e" m={0.8} r={0.2} />
          <Box p={[0, 0.56, 0]} s={[0.52, 0.12, 0.52]} c="#c94f30" r={0.6} />
        </group>
      ))}
    </group>
  );
}

function SimpleServiceInterior({
  kind,
}: {
  kind: Exclude<BuildingKind, "home" | "market" | "boutique" | "ink" | "club">;
}) {
  const spec = INTERIORS[kind];
  const palette =
    kind === "realtor"
      ? { floor: "#dcd8d0", wall: "#eef2f6", accent: "#1f3a5f", sign: "PRIME REALTORS" }
      : kind === "school"
        ? { floor: "#c9a87c", wall: "#f4ead3", accent: "#1f8a4c", sign: "CITY HIGH CLASSROOM" }
        : kind === "church"
          ? { floor: "#e8dfd2", wall: "#f7f4ed", accent: "#8c2f39", sign: "GRACE CATHEDRAL" }
          : kind === "dealer"
            ? { floor: "#cfd8e0", wall: "#eef3f7", accent: "#c44536", sign: "CITY MOTORS SHOWROOM" }
            : { floor: "#cfd5dd", wall: "#e8edf2", accent: "#1d2b4f", sign: "POLICE STATION" };

  return (
    <group>
      <RoomShell
        hx={spec.hx}
        hz={spec.hz}
        floorColor={palette.floor}
        wallColor={palette.wall}
        accent={palette.accent}
        doorX={spec.door.x}
        doorZ={spec.door.z}
      />
      <WallSign
        text={palette.sign}
        bg={palette.accent}
        fg="#ffffff"
        p={[0, 2.6, -spec.hz + 0.18]}
        w={5.2}
      />

      {kind === "realtor" && (
        <>
          <Box p={[0, 0, -2.8]} s={[4.6, 0.9, 1.4]} c="#3d2c22" />
          <Box p={[-0.9, 0.9, -2.8]} s={[0.8, 0.7, 0.8]} c="#efe2cc" />
          <Box p={[0.4, 0.9, -2.8]} s={[0.9, 1.1, 0.9]} c="#c9d6df" />
          <Box p={[-4.8, 0, 0.5]} s={[1.1, 0.6, 2.8]} c="#1f3a5f" />
        </>
      )}

      {kind === "school" && (
        <>
          <Box p={[0, 0.9, -5.82]} s={[5.5, 1.8, 0.08]} c="#1e5631" />
          <Box p={[0, 0, -3.8]} s={[3.0, 1.0, 1.2]} c="#7a4e2f" />
          {[-3.2, 3.2].map((dx) => (
            <group key={dx} position={[dx, 0, 0]}>
              <Box p={[0, 0, 0]} s={[2.0, 0.78, 1.1]} c="#b6895b" />
              <Box p={[0, 0, 1.0]} s={[0.8, 0.45, 0.7]} c="#3a5a80" />
            </group>
          ))}
        </>
      )}

      {kind === "church" && (
        <>
          <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1.9, 10.5]} />
            <meshStandardMaterial color="#8c2f39" roughness={0.95} />
          </mesh>
          <Box p={[0, 0, -4.3]} s={[4.2, 1.05, 1.4]} c="#f5f1e8" />
          <Box p={[0, 1.4, -5.8]} s={[0.25, 1.9, 0.15]} c="#d4a63a" m={0.8} r={0.2} />
          <Box p={[0, 1.85, -5.8]} s={[1.1, 0.25, 0.15]} c="#d4a63a" m={0.8} r={0.2} />
          {[-3.4, 3.4].map((px) =>
            [-0.5, 2.0].map((pz) => (
              <Box key={`${px}-${pz}`} p={[px, 0, pz]} s={[3.0, 0.65, 0.95]} c="#6d4329" />
            )),
          )}
        </>
      )}

      {kind === "dealer" && (
        <>
          <Box p={[0, 0, -4.6]} s={[4.2, 1.0, 1.2]} c="#232c36" />
          <Box p={[-3.6, 0, -1.2]} s={[2.8, 0.22, 2.8]} c="#9aa8b8" r={0.3} m={0.3} />
          <Box p={[3.6, 0, -1.2]} s={[4.2, 0.22, 2.8]} c="#9aa8b8" r={0.3} m={0.3} />
          <Suspense fallback={null}>
            <group position={[-3.6, 0.22, -1.2]} rotation-y={0.6}>
              <Model name="bicycle" size={[1.1, 1.1, 2.0]} />
            </group>
            <group position={[3.6, 0.22, -1.2]} rotation-y={-0.5}>
              <Model name="car" size={[2.1, 1.4, 3.8]} />
            </group>
          </Suspense>
        </>
      )}

      {kind === "police" && <PoliceCellVisual />}
    </group>
  );
}

function PoliceCellVisual() {
  const jailUntil = useGame((s) => s.jailUntil);
  const locked = jailUntil > Date.now();
  const doorHinge = useRef<THREE.Group>(null);
  const angle = useRef(0);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const isLocked = useGame.getState().jailUntil > Date.now();
    const target = isLocked ? 0 : -Math.PI * 0.45;
    angle.current += (target - angle.current) * Math.min(1, dt * 8);
    if (doorHinge.current) doorHinge.current.rotation.y = angle.current;
  });

  const barZ = [-5.2, -4.75, -4.3, -3.85, -3.4, -2.95, -2.6, -1.15, -0.75, -0.35];

  return (
    <>
      <Box p={[-0.8, 0, -3.2]} s={[3.5, 1.05, 1.4]} c="#1d2b4f" />
      <Box p={[-4.5, 0, 0.8]} s={[1.0, 0.48, 2.6]} c="#4b5a6e" />

      {/* Enclosed 3D Jail Cell (east side: x in [2.6, 6.5], z in [-5.5, -0.2]) */}
      <mesh position={[4.55, 0.015, -2.85]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.9, 5.3]} />
        <meshStandardMaterial color="#8f98a3" roughness={0.9} />
      </mesh>
      <Box p={[4.55, 0, -0.2]} s={[3.9, 2.8, 0.22]} c="#d5dce3" />
      {/* Header & bottom rail along barred front x = 2.6 */}
      <Box p={[2.6, 2.55, -2.85]} s={[0.16, 0.35, 5.3]} c="#333942" m={0.6} r={0.4} />
      <Box p={[2.6, 0, -3.95]} s={[0.14, 0.14, 3.0]} c="#333942" m={0.6} r={0.4} />
      <Box p={[2.6, 0, -0.8]} s={[0.14, 0.14, 1.2]} c="#333942" m={0.6} r={0.4} />
      {barZ.map((z) => (
        <Box key={z} p={[2.6, 0, z]} s={[0.07, 2.65, 0.07]} c="#454d59" m={0.75} r={0.3} />
      ))}

      {/* Hinged Barred Cell Door at z in [-2.6, -1.2] */}
      <group ref={doorHinge} position={[POLICE_CELL.door.x, 0, -2.6]}>
        <Box p={[0, 0, 0.04]} s={[0.09, 2.6, 0.09]} c="#2f3640" m={0.7} r={0.3} />
        <Box p={[0, 0, 1.36]} s={[0.09, 2.6, 0.09]} c="#2f3640" m={0.7} r={0.3} />
        <Box p={[0, 1.3, 0.7]} s={[0.08, 0.1, 1.36]} c="#2f3640" m={0.7} r={0.3} />
        <Box p={[0, 2.5, 0.7]} s={[0.08, 0.1, 1.36]} c="#2f3640" m={0.7} r={0.3} />
        {[0.32, 0.68, 1.04].map((dz) => (
          <Box key={dz} p={[0, 0, dz]} s={[0.06, 2.55, 0.06]} c="#4f5866" m={0.75} r={0.3} />
        ))}
        <Box
          p={[-0.08, 1.45, 1.25]}
          s={[0.05, 0.12, 0.12]}
          c={locked ? "#ff3b30" : "#34c759"}
          emissive={locked ? "#ff3b30" : "#34c759"}
          emissiveIntensity={1.2}
        />
      </group>

      {/* Cell Bunk Bench & Cell Toilet */}
      <Box p={[5.3, 0, -3.6]} s={[1.05, 0.45, 2.1]} c="#4e5866" r={0.85} />
      <Box p={[5.3, 0.45, -4.3]} s={[0.85, 0.14, 0.52]} c="#d5dce3" r={0.9} />
      <Suspense fallback={null}>
        <group position={[5.6, 0, -1.1]} rotation-y={-Math.PI / 2}>
          <Model name="toilet" size={[0.85, 0.95, 0.95]} />
        </group>
      </Suspense>
      <WallSign text="JAIL CELL" bg="#1d2b4f" fg="#ffd166" p={[4.55, 2.6, -5.28]} w={2.6} />
    </>
  );
}

export function InteriorScene({ kind }: { kind: Exclude<BuildingKind, "home"> }) {
  return (
    <group>
      {kind === "market" ? (
        <MarketInterior />
      ) : kind === "boutique" ? (
        <BoutiqueInterior />
      ) : kind === "ink" ? (
        <InkInterior />
      ) : kind === "club" ? (
        <ClubInterior />
      ) : (
        <SimpleServiceInterior kind={kind} />
      )}
      <Crowd npcs={rt.interiorNpcs} />
    </group>
  );
}
