import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rigGeometries, PART_SLOT, pose, newPose, type PoseIn } from "@/game/rig";
import { TATTOOS } from "@/game/catalog";
import { sharedMat } from "@/game/materials";
import type { Look } from "@/game/store";

export function Humanoid({
  look,
  female,
  getPose,
}: {
  look: Look;
  female: boolean;
  getPose: () => Omit<PoseIn, "female" | "hairStyle" | "tattoo">;
}) {
  const geos = useMemo(rigGeometries, []);
  const local = useMemo(newPose, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const mats = useMemo(() => {
    const nailColor = look.nails && look.nails.length > 0 ? look.nails : look.skin;
    const nailGloss = look.nails && look.nails.length > 0 ? 0.18 : 0.55;
    const tattooInk = TATTOOS.find((t) => t.id === look.tattoo)?.ink ?? "#182028";
    return PART_SLOT.map((slot) => {
      if (slot === "eye") return sharedMat("#140d0a", 0.25, 0.1);
      if (slot === "shoe") return sharedMat("#23262d", 0.7, 0.05);
      if (slot === "lip") return sharedMat("#8d4a44", 0.45, 0);
      if (slot === "nail") return sharedMat(nailColor, nailGloss, 0.08);
      if (slot === "tattoo") return sharedMat(tattooInk, 0.65, 0);
      const col = look[slot];
      return sharedMat(col, slot === "skin" ? 0.55 : 0.78, 0);
    });
  }, [look]);

  useFrame(() => {
    pose({ ...getPose(), female, hairStyle: look.hairStyle, tattoo: look.tattoo }, local);
    for (let i = 0; i < geos.length; i++) {
      const m = refs.current[i];
      const matrix = local[i];
      if (m && matrix) {
        m.matrix.copy(matrix);
        m.matrixWorldNeedsUpdate = true;
      }
    }
  });

  return (
    <group>
      {geos.map((g, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={g}
          material={mats[i]}
          matrixAutoUpdate={false}
          castShadow={false}
        />
      ))}
    </group>
  );
}
