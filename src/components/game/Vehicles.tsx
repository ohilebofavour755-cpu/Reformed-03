import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { rt } from "@/game/runtime";
import { sharedMat, getUnitBoxBottom, getUnitBoxCenter } from "@/game/materials";
import type { VehicleKind } from "@/game/sim/mobility";
import { Model } from "./Model";

const Box = ({
  p,
  s,
  c,
  r = 0.55,
  m = 0.25,
  emissive,
  emissiveIntensity = 0,
  rotX = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
  m?: number;
  emissive?: string;
  emissiveIntensity?: number;
  rotX?: number;
}) => (
  <mesh
    position={p}
    scale={s}
    rotation-x={rotX}
    geometry={getUnitBoxCenter()}
    material={sharedMat(c, r, m, emissive, emissiveIntensity)}
  />
);

export function RideVisual({ kind }: { kind: VehicleKind }) {
  if (kind === "bike") {
    return <Model name="bicycle" size={[0.6, 1.2, 1.9]} />;
  }
  if (kind === "car") {
    return <Model name="car" size={[1.9, 1.5, 4.2]} />;
  }
  if (kind === "moto") {
    // Sleek Power Bike / Sport Motorcycle
    return (
      <group>
        {/* Front & Rear Wheels */}
        <mesh
          position={[0, 0.34, 0.72]}
          rotation-z={Math.PI / 2}
          material={sharedMat("#1c1f24", 0.75, 0.1)}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.2, 14]} />
        </mesh>
        <mesh
          position={[0, 0.34, -0.72]}
          rotation-z={Math.PI / 2}
          material={sharedMat("#1c1f24", 0.75, 0.1)}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.24, 14]} />
        </mesh>
        {/* Alloy Rims */}
        <mesh
          position={[0, 0.34, 0.72]}
          rotation-z={Math.PI / 2}
          material={sharedMat("#c7ced6", 0.3, 0.8)}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.22, 10]} />
        </mesh>
        <mesh
          position={[0, 0.34, -0.72]}
          rotation-z={Math.PI / 2}
          material={sharedMat("#c7ced6", 0.3, 0.8)}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.26, 10]} />
        </mesh>
        {/* Frame, Engine & Fairing */}
        <Box p={[0, 0.56, 0]} s={[0.36, 0.34, 1.25]} c="#222730" r={0.4} m={0.5} />
        <Box p={[0, 0.82, 0.26]} s={[0.42, 0.3, 0.65]} c="#d94f30" r={0.28} m={0.35} />
        <Box p={[0, 0.76, -0.35]} s={[0.36, 0.16, 0.65]} c="#181a1f" r={0.65} />
        <Box
          p={[0, 0.86, 0.66]}
          s={[0.38, 0.38, 0.35]}
          c="#d94f30"
          r={0.25}
          m={0.35}
          rotX={-0.35}
        />
        {/* Handlebars & Headlight */}
        <Box p={[0, 1.05, 0.52]} s={[0.74, 0.06, 0.08]} c="#aeb6c0" r={0.25} m={0.8} />
        <Box
          p={[0, 0.84, 0.86]}
          s={[0.22, 0.14, 0.08]}
          c="#fff6d4"
          emissive="#ffe28a"
          emissiveIntensity={1.2}
        />
        {/* Exhaust */}
        <Box p={[0.22, 0.42, -0.58]} s={[0.1, 0.1, 0.72]} c="#b4bcc6" r={0.25} m={0.85} />
      </group>
    );
  }
  // Luxury Sports Car ("supercar")
  return (
    <group>
      {/* Low-slung Chassis & Sculpted Hood */}
      <mesh
        position={[0, 0.16, 0]}
        scale={[2.02, 0.52, 4.35]}
        geometry={getUnitBoxBottom()}
        material={sharedMat("#e03e2d", 0.2, 0.55)}
      />
      {/* Racing Twin Stripe */}
      <Box p={[0, 0.69, 0.15]} s={[0.32, 0.02, 4.1]} c="#f8f6f0" r={0.3} />
      {/* Aerodynamic Cabin & Windshield */}
      <Box p={[0, 0.92, -0.25]} s={[1.64, 0.48, 2.05]} c="#1a222d" r={0.12} m={0.7} />
      <Box p={[0, 1.15, -0.32]} s={[1.48, 0.06, 1.4]} c="#e03e2d" r={0.2} m={0.55} />
      {/* Carbon Rear Spoiler Wing */}
      <Box p={[-0.65, 0.8, -1.9]} s={[0.08, 0.28, 0.18]} c="#181b20" />
      <Box p={[0.65, 0.8, -1.9]} s={[0.08, 0.28, 0.18]} c="#181b20" />
      <Box p={[0, 0.94, -1.94]} s={[1.88, 0.06, 0.34]} c="#181b20" r={0.35} m={0.4} />
      {/* Headlights & Taillights */}
      <Box
        p={[-0.72, 0.46, 2.18]}
        s={[0.38, 0.12, 0.06]}
        c="#ffffff"
        emissive="#fff2c4"
        emissiveIntensity={1.3}
      />
      <Box
        p={[0.72, 0.46, 2.18]}
        s={[0.38, 0.12, 0.06]}
        c="#ffffff"
        emissive="#fff2c4"
        emissiveIntensity={1.3}
      />
      <Box
        p={[0, 0.48, -2.18]}
        s={[1.76, 0.1, 0.06]}
        c="#ff2e43"
        emissive="#ff2e43"
        emissiveIntensity={1.2}
      />
      {/* 4 Sport Wheels */}
      {[
        [-0.98, 0.34, 1.32],
        [0.98, 0.34, 1.32],
        [-0.98, 0.34, -1.32],
        [0.98, 0.34, -1.32],
      ].map(([wx, wy, wz], idx) => (
        <group key={idx} position={[wx!, wy!, wz!]}>
          <mesh rotation-z={Math.PI / 2} material={sharedMat("#15171c", 0.75, 0.1)}>
            <cylinderGeometry args={[0.34, 0.34, 0.24, 14]} />
          </mesh>
          <mesh rotation-z={Math.PI / 2} material={sharedMat("#d8b467", 0.25, 0.85)}>
            <cylinderGeometry args={[0.2, 0.2, 0.26, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Vehicle({ id, kind }: { id: string; kind: VehicleKind }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = useGame.getState().vehicles.find((item) => item.id === id);
    if (ref.current && v) {
      ref.current.position.set(v.x, 0, v.z);
      ref.current.rotation.y = v.heading;
    }
  });
  return (
    <group ref={ref}>
      <RideVisual kind={kind} />
    </group>
  );
}

function EscortPoliceCar() {
  const arrestStage = useGame((s) => s.arrestStage);
  const ref = useRef<THREE.Group>(null);
  const redRef = useRef<THREE.Mesh>(null);
  const blueRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(rt.player.x, 0, rt.player.z);
    ref.current.rotation.y = rt.player.heading;
    const flash = Math.floor(rt.t * 8) % 2 === 0;
    if (redRef.current) redRef.current.visible = flash;
    if (blueRef.current) blueRef.current.visible = !flash;
  });

  if (arrestStage?.kind !== "escort") return null;

  return (
    <group ref={ref}>
      <Box p={[0, 0.45, 0]} s={[1.95, 0.65, 4.2]} c="#1b2944" r={0.35} m={0.3} />
      <Box p={[0, 0.46, 0]} s={[1.98, 0.52, 1.65]} c="#f5f7fa" r={0.35} />
      <Box p={[0, 1.05, -0.2]} s={[1.65, 0.56, 2.05]} c="#1d2738" r={0.18} m={0.5} />
      <Box p={[0, 1.38, -0.15]} s={[1.1, 0.12, 0.28]} c="#22262e" />
      <mesh
        ref={redRef}
        position={[-0.3, 1.44, -0.15]}
        scale={[0.42, 0.12, 0.24]}
        geometry={getUnitBoxCenter()}
        material={sharedMat("#ff2a2a", 0.2, 0.1, "#ff2a2a", 2.0)}
      />
      <mesh
        ref={blueRef}
        position={[0.3, 1.44, -0.15]}
        scale={[0.42, 0.12, 0.24]}
        geometry={getUnitBoxCenter()}
        material={sharedMat("#2979ff", 0.2, 0.1, "#2979ff", 2.0)}
      />
    </group>
  );
}

function Smoke() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const left = rt.smoke.until - Date.now();
    ref.current.visible = left > 0;
    ref.current.position.set(rt.smoke.x, 0.8, rt.smoke.z);
    ref.current.children.forEach((c, i) => {
      c.position.y = (4 - left / 1000) * 0.4 + i * 0.2;
      c.scale.setScalar(0.5 + (4 - left / 1000) * 0.35);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 4) * 0.5, 0, Math.cos(i * 4) * 0.5]}>
          <sphereGeometry args={[0.4, 8, 6]} />
          <meshStandardMaterial color="#8b8e8c" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Vehicles() {
  const vehicles = useGame((s) => s.vehicles);
  return (
    <>
      <Suspense fallback={null}>
        {vehicles.map((v) => (
          <Vehicle key={v.id} id={v.id} kind={v.kind} />
        ))}
      </Suspense>
      <EscortPoliceCar />
      <Smoke />
    </>
  );
}
