import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { resolveApartmentPalette, OUTFITS } from "@/game/catalog";
import { RIDE_TIERS } from "@/game/rules";
import {
  BATH_DOOR,
  BATH_WALLS,
  EAST_DIVIDER_WALLS,
  TERRACE_BOUNDS,
  GARAGE_BOUNDS,
  insideHomeBathroom,
  homeBathDoorShouldOpen,
} from "@/game/sim/apartment";
import { sharedMat, getUnitBoxBottom, getUnitBoxCenter } from "@/game/materials";
import { rt } from "@/game/runtime";
import { Model } from "./Model";
import { RideVisual } from "./Vehicles";

function MatteFloor({ baseColor, houseTier }: { baseColor: string; houseTier: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const c = canvas.getContext("2d");
    if (c) {
      if (houseTier <= 1) {
        // Warm natural hardwood planks with subtle grain & staggered seams
        const woodBase = houseTier === 1 ? "#b6885c" : "#c59b70";
        c.fillStyle = woodBase;
        c.fillRect(0, 0, 256, 256);
        const tones = [
          "rgba(96,58,28,0.12)",
          "rgba(255,228,192,0.10)",
          "rgba(72,42,18,0.08)",
          "rgba(240,204,162,0.08)",
        ];
        const plankH = 32;
        for (let row = 0; row < 8; row++) {
          const y = row * plankH;
          const offset = (row % 2) * 64 + (row % 3) * 24;
          for (let col = -1; col < 3; col++) {
            const x = col * 128 + offset;
            c.fillStyle = tones[(row + col + 4) % tones.length]!;
            c.fillRect(x, y, 128, plankH);
            // Wood grain lines
            c.strokeStyle = "rgba(68,40,18,0.10)";
            c.lineWidth = 1;
            for (let g = 5; g < plankH - 3; g += 6) {
              c.beginPath();
              c.moveTo(x + 2, y + g);
              c.bezierCurveTo(
                x + 42,
                y + g + ((row + col) % 2 === 0 ? 1.5 : -1.5),
                x + 86,
                y + g - ((row + col) % 2 === 0 ? 1.2 : -1.2),
                x + 126,
                y + g,
              );
              c.stroke();
            }
            // Plank bevel seam
            c.strokeStyle = "rgba(56,32,14,0.22)";
            c.lineWidth = 1.5;
            c.strokeRect(x + 0.5, y + 0.5, 127, plankH - 1);
          }
        }
      } else if (houseTier === 2) {
        // Victoria Island High-Rise: warm honed travertine & oak inlay tiles
        c.fillStyle = baseColor;
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = "rgba(110,96,82,0.16)";
        c.lineWidth = 2;
        for (let y = 0; y < 256; y += 64) {
          for (let x = 0; x < 256; x += 64) {
            c.fillStyle =
              (x / 64 + y / 64) % 2 === 0 ? "rgba(255,248,238,0.09)" : "rgba(120,96,74,0.05)";
            c.fillRect(x + 1, y + 1, 62, 62);
            c.strokeRect(x, y, 64, 64);
          }
        }
        c.strokeStyle = "rgba(155,140,126,0.15)";
        c.beginPath();
        c.moveTo(0, 42);
        c.lineTo(128, 92);
        c.lineTo(256, 70);
        c.stroke();
      } else {
        // Banana Island Penthouse: warm limestone & brass inlay grid
        c.fillStyle = baseColor;
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = "rgba(196,160,92,0.26)";
        c.lineWidth = 2;
        for (let y = 0; y < 256; y += 64) {
          for (let x = 0; x < 256; x += 64) {
            c.fillStyle =
              (x / 64 + y / 64) % 2 === 0 ? "rgba(255,250,240,0.08)" : "rgba(110,88,62,0.04)";
            c.fillRect(x + 2, y + 2, 60, 60);
            c.strokeRect(x, y, 64, 64);
          }
        }
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 4);
    t.anisotropy = 1;
    return t;
  }, [baseColor, houseTier]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[14, 12]} />
      <meshStandardMaterial map={texture} roughness={0.86} metalness={0.02} />
    </mesh>
  );
}

function Part({
  p,
  s,
  c,
  r = 0.86,
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
}) {
  return (
    <mesh
      position={p}
      scale={s}
      rotation-y={rotY}
      geometry={getUnitBoxBottom()}
      material={sharedMat(c, r, m, emissive, emissiveIntensity)}
    />
  );
}

function BathDoor({ trimColor }: { trimColor: string }) {
  const hingeRef = useRef<THREE.Group>(null);
  const angle = useRef(0);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const open = homeBathDoorShouldOpen(rt.player.x, rt.player.z, rt.doorLocked);
    const target = open ? Math.PI * 0.48 : 0;
    angle.current += (target - angle.current) * Math.min(1, dt * 10);
    if (hingeRef.current) hingeRef.current.rotation.y = angle.current;
  });

  const inBath = insideHomeBathroom(rt.player.x, rt.player.z);
  const lockColor = rt.doorLocked ? "#d94f30" : inBath ? "#f2c14e" : "#2f7d5b";

  return (
    <group ref={hingeRef} position={[BATH_DOOR.x, 0, BATH_DOOR.hingeZ]}>
      <mesh
        position={[0, 1.15, BATH_DOOR.width / 2]}
        scale={[0.09, 2.3, BATH_DOOR.width]}
        geometry={getUnitBoxCenter()}
        material={sharedMat("#8a6144", 0.78)}
      />
      <mesh
        position={[0.07, 1.05, BATH_DOOR.width - 0.18]}
        scale={[0.06, 0.08, 0.14]}
        geometry={getUnitBoxCenter()}
        material={sharedMat(trimColor, 0.35, 0.65)}
      />
      <mesh
        position={[-0.07, 1.28, BATH_DOOR.width - 0.18]}
        scale={[0.04, 0.08, 0.08]}
        geometry={getUnitBoxCenter()}
        material={sharedMat(lockColor, 0.4, 0.2, lockColor, 0.6)}
      />
    </group>
  );
}

function OpenWardrobeCloset({ trimColor, accent }: { trimColor: string; accent: string }) {
  return (
    <group position={[-1.7, 0, -5.35]}>
      {/* Open wooden wardrobe shell */}
      <Part p={[0, 0, -0.34]} s={[1.86, 2.38, 0.08]} c="#9e7453" r={0.85} />
      <Part p={[-0.89, 0, 0]} s={[0.08, 2.38, 0.74]} c="#8a6144" r={0.85} />
      <Part p={[0.89, 0, 0]} s={[0.08, 2.38, 0.74]} c="#8a6144" r={0.85} />
      <Part p={[0, 2.32, 0]} s={[1.9, 0.1, 0.78]} c="#8a6144" r={0.82} />
      <Part p={[0, 1.82, 0]} s={[1.74, 0.06, 0.66]} c="#b48a66" r={0.85} />
      <Part p={[0, 0.42, 0]} s={[1.74, 0.06, 0.66]} c="#b48a66" r={0.85} />
      <Part p={[0, 0.04, 0]} s={[1.78, 0.06, 0.68]} c="#8a6144" r={0.85} />
      {/* Warm closet LED strip & brass hanging bar */}
      <Part
        p={[0, 1.76, -0.22]}
        s={[1.64, 0.04, 0.04]}
        c="#fff2d2"
        emissive="#ffd58c"
        emissiveIntensity={0.8}
      />
      <Part p={[0, 1.66, 0.02]} s={[1.7, 0.04, 0.04]} c={trimColor} m={0.7} r={0.3} />
      {/* Hanging outfits */}
      {OUTFITS.map((o, i) => (
        <Part
          key={o.id}
          p={[-0.64 + i * 0.32, 0.84, 0.02]}
          s={[0.22, 0.76, 0.38]}
          c={o.shirt}
          r={0.9}
        />
      ))}
      {/* Folded stacks & storage boxes on upper shelf */}
      <Part p={[-0.52, 1.88, 0]} s={[0.45, 0.16, 0.42]} c={accent} r={0.9} />
      <Part p={[-0.52, 2.04, 0]} s={[0.42, 0.12, 0.38]} c="#faf4ef" r={0.9} />
      <Part p={[0.48, 1.88, 0]} s={[0.52, 0.24, 0.46]} c="#e9dfd4" r={0.88} />
      {/* Shoe pairs on bottom shelf */}
      <Part p={[-0.5, 0.07, 0.04]} s={[0.26, 0.12, 0.32]} c="#f5f0ea" r={0.8} />
      <Part p={[0.05, 0.07, 0.04]} s={[0.26, 0.12, 0.32]} c={accent} r={0.8} />
      <Part p={[0.52, 0.07, 0.04]} s={[0.26, 0.12, 0.32]} c="#2d3138" r={0.8} />
    </group>
  );
}

const furniture: {
  name: string;
  x: number;
  z: number;
  size: [number, number, number];
  rotate?: number;
}[] = [
  { name: "bedDouble", x: -4.7, z: -3.6, size: [2.5, 0.85, 3.8] },
  { name: "loungeSofa", x: -5.1, z: -0.2, size: [2.6, 1.0, 1.2] },
  { name: "kitchenStove", x: 0.32, z: -5.0, size: [1.02, 1.05, 1.2] },
  { name: "kitchenSink", x: 2.15, z: -5.0, size: [1.06, 1.05, 1.2] },
  { name: "kitchenFridge", x: 4.15, z: -5.0, size: [1.16, 2.2, 1.24] },
  { name: "table", x: 2.8, z: -0.5, size: [1.9, 0.85, 1.4] },
  { name: "chair", x: 1.42, z: -0.5, size: [0.64, 0.95, 0.64], rotate: Math.PI / 2 },
  { name: "chair", x: 4.18, z: -0.5, size: [0.64, 0.95, 0.64], rotate: -Math.PI / 2 },
  { name: "desk", x: 3.35, z: 3.2, size: [1.15, 0.85, 2.2], rotate: Math.PI / 2 },
  { name: "chair", x: 2.2, z: 3.2, size: [0.64, 0.95, 0.64], rotate: Math.PI / 2 },
  { name: "laptop", x: 3.35, z: 3.15, size: [0.62, 0.38, 0.48], rotate: -Math.PI / 2 },
  { name: "pottedPlant", x: -3.05, z: -5.3, size: [0.62, 1.15, 0.62] },
  { name: "pottedPlant", x: 6.0, z: -5.0, size: [0.65, 1.25, 0.65] },
  { name: "toilet", x: -6.05, z: 4.95, size: [0.95, 1.05, 1.1], rotate: Math.PI / 2 },
];

export function Apartment() {
  const s = useGame();
  const gender = s.profile?.gender ?? "female";
  const pal = resolveApartmentPalette(gender, s.roomTheme);
  const terrace = TERRACE_BOUNDS(s.house);
  const terraceMidX = (terrace.minX + terrace.maxX) / 2;
  const garageMidX = (GARAGE_BOUNDS.minX + GARAGE_BOUNDS.maxX) / 2;
  const garageMidZ = (GARAGE_BOUNDS.minZ + GARAGE_BOUNDS.maxZ) / 2;
  const activeRide = RIDE_TIERS.find((r) => r.tier === s.rideTier);
  const bulbPositions = Array.from(
    { length: 6 },
    (_, i) => terrace.minX + 0.7 + (i * (terrace.width - 1.2)) / 5,
  );

  const plinthWidth = Math.max(terrace.maxX, GARAGE_BOUNDS.maxX) + 7.4;
  const plinthCenterX = (-7.2 + Math.max(terrace.maxX, GARAGE_BOUNDS.maxX) + 0.2) / 2;

  return (
    <group>
      {/* Solid Architectural Slab Plinth beneath Apartment */}
      <Part p={[plinthCenterX, -0.34, 0]} s={[plinthWidth, 0.33, 12.6]} c="#2d241e" r={0.95} />

      <MatteFloor baseColor={pal.floor} houseTier={s.house} />

      {/* Outer Apartment Walls (North, West, Low Cutaway South Entrance, East Partition) */}
      <Part p={[0, 0, -6]} s={[14.3, 3.2, 0.2]} c={pal.accentWall} r={0.9} />
      <Part p={[-7, 0, 0]} s={[0.2, 3.2, 12]} c={pal.wall} r={0.9} />
      <Part p={[-2.1, 0, 6]} s={[2.4, 0.36, 0.2]} c={pal.wall} r={0.9} />
      <Part p={[4.1, 0, 6]} s={[5.8, 0.36, 0.2]} c={pal.wall} r={0.9} />
      <Part p={[0, 0, 6]} s={[14, 0.14, 0.22]} c={pal.trim} r={0.7} />

      {/* Baseboards & Crown Molding Trim along Interior Walls */}
      <Part p={[0, 0, -5.88]} s={[13.9, 0.14, 0.05]} c={pal.trim} r={0.65} />
      <Part p={[0, 3.08, -5.86]} s={[14.0, 0.12, 0.12]} c={pal.trim} r={0.65} />
      <Part p={[-6.88, 0, 0]} s={[0.05, 0.14, 11.8]} c={pal.trim} r={0.65} />
      <Part p={[-6.86, 3.08, 0]} s={[0.12, 0.12, 11.8]} c={pal.trim} r={0.65} />
      <Part p={[-0.1, 0.14, -5.89]} s={[0.12, 2.94, 0.04]} c={pal.wall} r={0.85} />
      <Part p={[-6.89, 0.14, -2.1]} s={[0.04, 2.94, 0.12]} c={pal.wall} r={0.85} />

      {/* Cozy West Window with Warm Dusk/Day Glow, Sill & Curtains */}
      <Part p={[-6.87, 1.02, -0.55]} s={[0.12, 0.08, 2.35]} c={pal.trim} r={0.55} />
      <Part
        p={[-6.88, 1.08, -0.55]}
        s={[0.04, 1.48, 2.15]}
        c="#ffe7c2"
        emissive="#ffd49c"
        emissiveIntensity={0.42}
        r={0.35}
      />
      <Part p={[-6.85, 1.08, -0.55]} s={[0.05, 1.48, 0.06]} c={pal.trim} r={0.5} />
      <Part p={[-6.85, 1.82, -0.55]} s={[0.05, 0.06, 2.2]} c={pal.trim} r={0.5} />
      <Part p={[-6.83, 0.8, -1.68]} s={[0.08, 1.88, 0.34]} c={pal.accent} r={0.92} />
      <Part p={[-6.83, 0.8, 0.58]} s={[0.08, 1.88, 0.34]} c={pal.accent} r={0.92} />

      {EAST_DIVIDER_WALLS.map((w, i) => (
        <group key={i}>
          <Part p={[w.x, 0, w.z]} s={[w.hx * 2, 3.1, w.hz * 2]} c={pal.wall} r={0.9} />
          <Part p={[w.x - 0.12, 0, w.z]} s={[0.04, 0.14, w.hz * 2]} c={pal.trim} r={0.65} />
        </group>
      ))}
      {/* Sliding Glass Terrace Doors (x = 7.0, z in [-2.3, -0.3]) */}
      <Part p={[7.0, 2.35, -1.3]} s={[0.24, 0.75, 2.0]} c={pal.wall} r={0.9} />
      <Part p={[7.0, 0, -2.32]} s={[0.1, 2.35, 0.1]} c={pal.trim} m={0.4} r={0.45} />
      <Part p={[7.0, 0, -0.28]} s={[0.1, 2.35, 0.1]} c={pal.trim} m={0.4} r={0.45} />
      <mesh
        position={[7.06, 1.18, -2.02]}
        scale={[0.04, 2.28, 0.56]}
        geometry={getUnitBoxCenter()}
        material={sharedMat("#d8eef7", 0.12, 0.2)}
      />
      <mesh
        position={[7.06, 1.18, -0.58]}
        scale={[0.04, 2.28, 0.56]}
        geometry={getUnitBoxCenter()}
        material={sharedMat("#d8eef7", 0.12, 0.2)}
      />
      {/* Garage Access Door Frame (x = 7.0, z in [3.5, 5.0]) */}
      <Part p={[7.0, 2.35, 4.25]} s={[0.24, 0.75, 1.5]} c={pal.wall} r={0.9} />

      {/* Front doormat */}
      <mesh position={[0, 0.015, 5.45]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.9, 0.85]} />
        <meshStandardMaterial color={pal.accent} roughness={0.96} />
      </mesh>

      {/* Cozy Bedroom Rug with Woven Border, Pillows, Blanket & Nightstand */}
      <mesh position={[-4.7, 0.012, -3.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.9, 4.55]} />
        <meshStandardMaterial color={pal.trim} roughness={0.98} />
      </mesh>
      <mesh position={[-4.7, 0.015, -3.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.6, 4.25]} />
        <meshStandardMaterial color={pal.accent} roughness={0.98} />
      </mesh>
      <Part p={[-5.25, 0.5, -4.85]} s={[0.85, 0.16, 0.48]} c={pal.pillow} r={0.92} />
      <Part p={[-4.15, 0.5, -4.85]} s={[0.85, 0.16, 0.48]} c={pal.pillow} r={0.92} />
      <Part p={[-4.7, 0.47, -2.52]} s={[2.32, 0.09, 1.4]} c={pal.bedSheet} r={0.95} />
      <Part p={[-6.35, 0, -4.8]} s={[0.78, 0.65, 0.78]} c="#7d593e" r={0.85} />
      <Part p={[-6.35, 0.65, -4.8]} s={[0.14, 0.26, 0.14]} c={pal.trim} m={0.45} r={0.35} />
      <Part
        p={[-6.35, 0.91, -4.8]}
        s={[0.38, 0.28, 0.38]}
        c="#fff4d6"
        emissive="#ffd288"
        emissiveIntensity={0.75}
        r={0.7}
      />

      {/* Open Wooden 3D Wardrobe Closet */}
      <OpenWardrobeCloset trimColor={pal.trim} accent={pal.accent} />

      {/* Cozy Living Room Rug with Border, Coffee Table, TV Console & Dining Centerpiece */}
      <mesh position={[-4.85, 0.012, 0.72]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.85, 3.15]} />
        <meshStandardMaterial color="#e8dfd4" roughness={0.98} />
      </mesh>
      <mesh position={[-4.85, 0.016, 0.72]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.55, 2.85]} />
        <meshStandardMaterial color={pal.sofa} roughness={0.98} />
      </mesh>
      <Part p={[-5.1, 0, 1.05]} s={[1.55, 0.42, 0.68]} c="#78563c" r={0.82} />
      <Part p={[-4.8, 0.42, 1.05]} s={[0.16, 0.14, 0.16]} c="#f5efe6" r={0.5} />
      <Part p={[-5.32, 0.42, 1.05]} s={[0.32, 0.06, 0.24]} c={pal.accent} r={0.7} />
      <Part p={[-5.2, 0, 2.05]} s={[2.1, 0.55, 0.42]} c="#5e4330" r={0.8} />
      <Part p={[-5.2, 0.85, 2.22]} s={[1.8, 1.05, 0.08]} c="#1a1d22" r={0.3} m={0.35} />
      <Part
        p={[-5.2, 0.9, 2.17]}
        s={[1.66, 0.92, 0.02]}
        c="#284c66"
        emissive="#58a6d6"
        emissiveIntensity={0.45}
        r={0.25}
      />

      {/* Dining Table Centerpiece & Warm Workspace Desk Lamp */}
      <Part p={[2.8, 0.85, -0.5]} s={[0.42, 0.08, 0.42]} c="#f5efe6" r={0.5} />
      <Part p={[2.8, 0.93, -0.5]} s={[0.18, 0.18, 0.18]} c="#4d7c4f" r={0.8} />
      <Part p={[3.55, 0.85, 2.45]} s={[0.16, 0.04, 0.16]} c={pal.trim} m={0.4} r={0.4} />
      <Part p={[3.55, 0.89, 2.45]} s={[0.05, 0.34, 0.05]} c={pal.trim} m={0.4} r={0.4} />
      <Part
        p={[3.5, 1.18, 2.45]}
        s={[0.22, 0.14, 0.22]}
        c="#fff3d6"
        emissive="#ffd58c"
        emissiveIntensity={0.75}
        r={0.6}
      />

      {/* Framed Multi-Layer Wall Art & Continuous Kitchen Counter + Upper Cabinets */}
      <Part p={[-4.7, 1.85, -5.88]} s={[2.15, 1.18, 0.05]} c={pal.trim} m={0.3} r={0.45} />
      <Part p={[-4.7, 1.91, -5.85]} s={[1.95, 1.0, 0.03]} c="#f8f2ea" r={0.85} />
      <Part p={[-4.7, 1.98, -5.83]} s={[1.65, 0.78, 0.03]} c={pal.accent} r={0.8} />
      <Part p={[1.6, 1.82, -5.88]} s={[2.3, 1.18, 0.05]} c={pal.trim} m={0.3} r={0.45} />
      <Part p={[1.6, 1.88, -5.85]} s={[2.1, 1.0, 0.03]} c="#f8f2ea" r={0.85} />
      <Part p={[1.6, 1.95, -5.83]} s={[1.82, 0.78, 0.03]} c={pal.bedSheet} r={0.8} />

      {/* Kitchen Backsplash, Prep Counters, Range Hood & Upper Cabinets */}
      <Part p={[1.25, 0.92, -5.66]} s={[4.2, 0.72, 0.05]} c="#e9e1d6" r={0.6} />
      <Part p={[-0.55, 0, -5.0]} s={[0.62, 0.92, 1.16]} c="#ede6de" r={0.82} />
      <Part p={[1.22, 0, -5.0]} s={[0.68, 0.92, 1.16]} c="#ede6de" r={0.82} />
      <Part p={[3.08, 0, -5.0]} s={[0.68, 0.92, 1.16]} c="#ede6de" r={0.82} />
      <Part p={[0.32, 1.05, -5.0]} s={[0.38, 0.22, 0.38]} c="#c9412b" m={0.3} r={0.45} />
      <Part p={[0.32, 2.05, -5.32]} s={[0.96, 0.22, 0.7]} c="#cfd4da" m={0.55} r={0.35} />
      <Part p={[0.32, 2.27, -5.52]} s={[0.34, 0.76, 0.3]} c="#cfd4da" m={0.55} r={0.35} />
      <Part p={[2.15, 2.02, -5.42]} s={[2.45, 0.88, 0.5]} c="#8a6144" r={0.78} />

      {/* Tier 1+ Lekki Phase 1 warm cove lighting & dual-monitor workspace upgrade */}
      {s.house >= 1 && (
        <>
          <Part
            p={[0, 3.02, -5.82]}
            s={[13.4, 0.06, 0.06]}
            c="#fff3d6"
            emissive="#ffd48a"
            emissiveIntensity={0.7}
          />
          <Part p={[3.5, 0.88, 3.7]} s={[0.12, 0.45, 0.68]} c="#181c22" r={0.3} />
          <Part
            p={[3.43, 1.05, 3.7]}
            s={[0.02, 0.36, 0.6]}
            c="#3b82f6"
            emissive="#60a5fa"
            emissiveIntensity={0.5}
          />
        </>
      )}

      {/* Tier 2+ Victoria Island Luxury High-Rise chandelier & ottoman */}
      {s.house >= 2 && (
        <>
          <Part
            p={[0.5, 3.05, -0.5]}
            s={[1.25, 0.14, 1.25]}
            c="#ffe8b0"
            emissive="#ffd07b"
            emissiveIntensity={0.85}
            r={0.4}
          />
          <Part p={[2.8, 0, -1.65]} s={[0.6, 0.6, 0.6]} c={pal.sofa} r={0.9} />
        </>
      )}

      {/* Tier 3 Banana Island Waterfront Penthouse crown pendant */}
      {s.house >= 3 && (
        <Part
          p={[-4.7, 3.05, -2.5]}
          s={[1.4, 0.12, 1.4]}
          c="#fff0c4"
          emissive="#ffd27a"
          emissiveIntensity={0.9}
          r={0.35}
        />
      )}

      {/* Enclosed Private Bathroom (SW corner: x in [-7, -3.8], z in [2.4, 6.0]) */}
      <mesh position={[-5.4, 0.02, 4.2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.2, 3.6]} />
        <meshStandardMaterial color="#e5ecee" roughness={0.82} metalness={0} />
      </mesh>
      <mesh position={[-5.2, 0.025, 4.95]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.0, 0.85]} />
        <meshStandardMaterial color={pal.accent} roughness={0.96} />
      </mesh>
      {BATH_WALLS.map((w, i) => (
        <group key={i}>
          <Part p={[w.x, 0, w.z]} s={[w.hx * 2, 2.8, w.hz * 2]} c={pal.wall} r={0.9} />
          <Part
            p={[w.x, 0, w.z]}
            s={[w.hx * 2 + 0.04, 0.14, w.hz * 2 + 0.04]}
            c={pal.trim}
            r={0.65}
          />
        </group>
      ))}
      <Part
        p={[BATH_DOOR.x, 2.3, BATH_DOOR.z]}
        s={[0.24, 0.5, BATH_DOOR.width]}
        c={pal.wall}
        r={0.9}
      />
      <Part p={[-6.25, 0, 3.15]} s={[0.85, 0.82, 0.9]} c="#f4f1ea" r={0.65} />
      <Part p={[-6.25, 0.82, 3.15]} s={[0.7, 0.08, 0.72]} c="#ffffff" r={0.4} />
      <Part p={[-6.86, 1.25, 3.15]} s={[0.05, 0.95, 0.75]} c="#b8d4e3" m={0.75} r={0.15} />
      <Part p={[-4.85, 1.15, 2.54]} s={[0.68, 0.04, 0.06]} c={pal.trim} m={0.6} r={0.3} />
      <Part p={[-4.85, 0.75, 2.56]} s={[0.52, 0.42, 0.04]} c={pal.pillow} r={0.92} />
      <BathDoor trimColor={pal.trim} />

      {/* OUTDOOR TERRACE / BALCONY (x in [7.0, terrace.maxX], z in [-5.7, 1.2]) */}
      <group>
        <mesh position={[terraceMidX, 0.01, -2.25]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[terrace.width, 6.9]} />
          <meshStandardMaterial color={pal.terraceFloor} roughness={0.95} metalness={0} />
        </mesh>
        {/* Terrace outdoor rug */}
        <mesh position={[9.4, 0.02, -3.1]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.9, 3.3]} />
          <meshStandardMaterial color={pal.accent} roughness={0.98} />
        </mesh>
        {/* Solid divider wall between Terrace and Garage */}
        <Part
          p={[(terrace.minX + Math.max(terrace.maxX, GARAGE_BOUNDS.maxX)) / 2, 0, 1.3]}
          s={[Math.max(terrace.width, GARAGE_BOUNDS.maxX - GARAGE_BOUNDS.minX), 2.5, 0.22]}
          c={pal.wall}
          r={0.9}
        />
        {/* Safety Railings (North & East glass + trim handrail) */}
        <Part
          p={[terraceMidX, 0, terrace.minZ]}
          s={[terrace.width, 0.18, 0.14]}
          c={pal.trim}
          r={0.5}
        />
        <Part
          p={[terraceMidX, 0.98, terrace.minZ]}
          s={[terrace.width, 0.08, 0.12]}
          c={pal.trim}
          m={0.3}
          r={0.4}
        />
        <mesh
          position={[terraceMidX, 0.56, terrace.minZ]}
          scale={[terrace.width - 0.2, 0.74, 0.04]}
          geometry={getUnitBoxCenter()}
          material={sharedMat("#d8eef7", 0.15, 0.15)}
        />
        <Part p={[terrace.maxX, 0, -2.25]} s={[0.14, 0.18, 6.9]} c={pal.trim} r={0.5} />
        <Part p={[terrace.maxX, 0.98, -2.25]} s={[0.12, 0.08, 6.9]} c={pal.trim} m={0.3} r={0.4} />
        <mesh
          position={[terrace.maxX, 0.56, -2.25]}
          scale={[0.04, 0.74, 6.7]}
          geometry={getUnitBoxCenter()}
          material={sharedMat("#d8eef7", 0.15, 0.15)}
        />
        {/* Corner String Light Posts & Warm Overhead Bulbs */}
        <Part p={[terrace.minX + 0.2, 0, terrace.minZ + 0.2]} s={[0.1, 2.7, 0.1]} c={pal.trim} />
        <Part p={[terrace.maxX - 0.2, 0, terrace.minZ + 0.2]} s={[0.1, 2.7, 0.1]} c={pal.trim} />
        <Part p={[terrace.maxX - 0.2, 0, 1.0]} s={[0.1, 2.7, 0.1]} c={pal.trim} />
        <Part
          p={[terraceMidX, 2.65, terrace.minZ + 0.25]}
          s={[terrace.width - 0.3, 0.03, 0.03]}
          c="#2f2c2a"
        />
        {bulbPositions.map((bx, i) => (
          <Part
            key={i}
            p={[bx, 2.52, terrace.minZ + 0.25]}
            s={[0.14, 0.14, 0.14]}
            c="#fff3cc"
            emissive="#ffcf78"
            emissiveIntensity={1.2}
            r={0.3}
          />
        ))}
        {/* Terrace Lounge Chair & Side Table (matches APARTMENT_SEATS.terrace) */}
        <Part p={[9.4, 0, -3.7]} s={[1.15, 0.36, 1.15]} c="#7d593e" r={0.85} />
        <Part p={[9.4, 0.36, -3.7]} s={[1.05, 0.14, 1.05]} c={pal.sofa} r={0.92} />
        <Part p={[9.4, 0.5, -4.16]} s={[1.05, 0.48, 0.16]} c={pal.sofa} r={0.92} />
        <Part p={[9.4, 0, -2.3]} s={[0.68, 0.45, 0.68]} c="#7d593e" r={0.82} />
        <Part
          p={[9.4, 0.46, -2.3]}
          s={[0.18, 0.18, 0.18]}
          c="#fff3d0"
          emissive="#ffd07b"
          emissiveIntensity={0.6}
        />

        {/* Banana Island Tier 3 Waterfront Plunge Pool & Sun Lounger on Expanded Terrace */}
        {s.house >= 3 && (
          <group>
            <Part p={[14.2, 0.02, -2.8]} s={[2.6, 0.18, 4.4]} c="#f3efe8" r={0.8} />
            <mesh position={[14.2, 0.21, -2.8]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[2.1, 3.9]} />
              <meshStandardMaterial color="#36b5c9" roughness={0.22} metalness={0.12} />
            </mesh>
            <Part p={[12.2, 0, -3.5]} s={[0.95, 0.34, 1.7]} c="#7d593e" r={0.85} />
            <Part p={[12.2, 0.34, -3.5]} s={[0.85, 0.12, 1.6]} c={pal.bedSheet} r={0.92} />
          </group>
        )}

        {/* Scenic Distant City Skyline & Lagoon Horizon Overlooking Terrace */}
        <group position={[23, -4, -3]}>
          {[
            { z: -12, h: s.house >= 2 ? 16 : 12, w: 4, c: "#b5c7d9" },
            { z: -5, h: s.house >= 2 ? 22 : 17, w: 4.5, c: "#9db4cb" },
            { z: 3, h: s.house >= 2 ? 19 : 14, w: 4.2, c: "#c7d4e2" },
            { z: 10, h: s.house >= 2 ? 24 : 19, w: 5, c: "#a7bed4" },
          ].map((b, i) => (
            <Part key={i} p={[0, 0, b.z]} s={[b.w, b.h, b.w]} c={b.c} r={0.9} />
          ))}
          {s.house >= 3 && (
            <mesh position={[14, 0.5, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[36, 80]} />
              <meshStandardMaterial color="#2b8da3" roughness={0.25} />
            </mesh>
          )}
        </group>
      </group>

      {/* ATTACHED COVERED GARAGE BAY (x in [7.0, 12.2], z in [1.4, 5.8]) */}
      <group>
        <mesh position={[garageMidX, 0.012, garageMidZ]} rotation-x={-Math.PI / 2}>
          <planeGeometry
            args={[
              GARAGE_BOUNDS.maxX - GARAGE_BOUNDS.minX,
              GARAGE_BOUNDS.maxZ - GARAGE_BOUNDS.minZ,
            ]}
          />
          <meshStandardMaterial color="#7d838c" roughness={0.96} metalness={0} />
        </mesh>
        {/* Parking Bay Outline */}
        <mesh position={[10.2, 0.02, 3.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.8, 2.0]} />
          <meshStandardMaterial color="#676d75" roughness={0.96} metalness={0} />
        </mesh>
        {/* Cutaway Garage Walls & Covered Roof Beam */}
        <Part p={[GARAGE_BOUNDS.maxX, 0, garageMidZ]} s={[0.2, 2.6, 4.4]} c="#d9dde2" r={0.9} />
        <Part p={[garageMidX, 0, GARAGE_BOUNDS.maxZ]} s={[5.2, 0.35, 0.2]} c="#d9dde2" r={0.9} />
        <Part
          p={[garageMidX, 2.5, GARAGE_BOUNDS.minZ + 0.1]}
          s={[5.2, 0.22, 0.35]}
          c={pal.trim}
          r={0.7}
        />
        {/* Garage Tool Cabinet & Spare Wheel */}
        <Part p={[11.6, 0, 2.1]} s={[0.7, 1.35, 1.1]} c="#c44536" r={0.6} />
        <Part p={[8.2, 0.4, 1.7]} s={[0.55, 0.72, 0.32]} c="#22252b" r={0.85} />
      </group>

      {/* Warm Ceiling Pendant Fixture & Cozy Interior Lighting (no dynamic shadows) */}
      <Part p={[0.5, 2.95, -0.5]} s={[0.06, 0.35, 0.06]} c={pal.trim} m={0.6} r={0.35} />
      <Part
        p={[0.5, 2.75, -0.5]}
        s={[0.72, 0.24, 0.72]}
        c="#fff1d6"
        emissive="#ffd699"
        emissiveIntensity={0.65}
        r={0.75}
      />
      <pointLight
        position={[0.5, 2.6, -0.5]}
        intensity={14}
        distance={24}
        decay={1.4}
        color="#ffe4be"
      />
      <pointLight
        position={[-4.8, 2.2, -1.8]}
        intensity={7}
        distance={13}
        decay={1.5}
        color="#ffd294"
      />

      <Suspense fallback={null}>
        {furniture.map((f, idx) => (
          <group
            key={`${f.name}-${idx}`}
            position={[f.x, f.name === "laptop" ? 0.86 : 0, f.z]}
            rotation-y={f.rotate ?? 0}
          >
            <Model
              name={f.name}
              size={f.size}
              tint={f.name === "loungeSofa" ? pal.sofa : undefined}
            />
          </group>
        ))}

        {/* Terrace Plants (extra greenery unlocked on higher house tiers) */}
        <group position={[terrace.maxX - 0.65, 0, terrace.minZ + 0.7]}>
          <Model name="pottedPlant" size={[0.72, 1.35, 0.72]} />
        </group>
        {s.house >= 1 && (
          <group position={[terrace.maxX - 0.65, 0, 0.55]}>
            <Model name="pottedPlant" size={[0.78, 1.45, 0.78]} />
          </group>
        )}

        {/* Parked Ride Tier Inside Garage Bay */}
        {activeRide && (
          <group position={[10.2, 0.02, 3.6]} rotation-y={-Math.PI / 2} scale={0.74}>
            <RideVisual kind={activeRide.kind} />
          </group>
        )}

        {s.decor.map((d) => {
          if (d.kind === "rug") {
            return (
              <mesh
                key={d.id}
                position={[d.x, 0.018, d.z]}
                rotation-x={-Math.PI / 2}
                rotation-z={d.rotation}
              >
                <planeGeometry args={[1.6, 1.2]} />
                <meshStandardMaterial color={pal.accent} roughness={0.96} />
              </mesh>
            );
          }
          const modelName =
            d.kind === "plant"
              ? "pottedPlant"
              : d.kind === "lamp"
                ? "lampRoundFloor"
                : d.kind === "armchair"
                  ? "chair"
                  : d.kind === "bookshelf"
                    ? "bookcaseClosedDoors"
                    : d.kind === "table"
                      ? "table"
                      : "bear";
          const size: [number, number, number] =
            d.kind === "lamp"
              ? [0.55, 1.75, 0.55]
              : d.kind === "bookshelf"
                ? [1.1, 1.9, 0.6]
                : d.kind === "table"
                  ? [1.0, 0.65, 0.8]
                  : d.kind === "armchair"
                    ? [0.85, 0.95, 0.85]
                    : [0.7, 1.0, 0.7];
          return (
            <group key={d.id} position={[d.x, 0, d.z]} rotation-y={d.rotation}>
              <Model
                name={modelName}
                size={size}
                tint={d.kind === "armchair" ? pal.sofa : undefined}
              />
            </group>
          );
        })}
      </Suspense>
    </group>
  );
}
