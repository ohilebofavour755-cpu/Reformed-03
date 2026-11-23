import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rigGeometries, PART_SLOT, pose, newPose, type PoseIn } from "@/game/rig";
import type { Look } from "@/game/store";

export function Humanoid({ look, female, getPose }: { look: Look; female: boolean; getPose: () => Omit<PoseIn, "female" | "hairStyle"> }) {
  const geos = useMemo(rigGeometries, []);
  const local = useMemo(newPose, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    pose({ ...getPose(), female, hairStyle: look.hairStyle }, local);
    refs.current.forEach((m, i) => { const matrix = local[i]; if (m && matrix) { m.matrix.copy(matrix); m.matrixWorldNeedsUpdate = true; } });
  });
  const color = (i: number) => {
    const s = PART_SLOT[i];
    return s === "eye" ? "#120c0a" : s ? look[s] : "#fff";
  };
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} geometry={g} matrixAutoUpdate={false} castShadow={i < 2}>
          <meshStandardMaterial color={color(i)} roughness={PART_SLOT[i] === "skin" ? 0.5 : 0.8} />
        </mesh>
      ))}
    </group>
  );
}
