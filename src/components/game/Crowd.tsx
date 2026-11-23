import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rigGeometries, PART_SLOT, pose, newPose } from "@/game/rig";
import { rt } from "@/game/runtime";

const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
export function Crowd() {
  const geos = useMemo(rigGeometries, []);
  const mats = useMemo(() => geos.map((_, i) => new THREE.MeshStandardMaterial({ color: PART_SLOT[i] === "eye" ? "#120c0a" : "#ffffff", roughness: PART_SLOT[i] === "skin" ? 0.5 : 0.8 })), [geos]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const N = rt.npcs.length;
  const local = useMemo(newPose, []);
  const tmp = useMemo(() => ({ root: new THREE.Matrix4(), m: new THREE.Matrix4(), e: new THREE.Euler(), c: new THREE.Color() }), []);

  useEffect(() => {
    refs.current.forEach((im, i) => {
      if (!im) return;
      const slot = PART_SLOT[i];
      if (slot === "eye" || !slot) return;
      rt.npcs.forEach((n, k) => im.setColorAt(k, tmp.c.set(n[slot])));
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
  }, [tmp]);

  useFrame(() => {
    const { root, m, e } = tmp;
    const px = rt.player.x, pz = rt.player.z;
    rt.npcs.forEach((n, k) => {
      const far = Math.abs(n.x - px) > 120 || Math.abs(n.z - pz) > 120;
      if (n.mode === "off" || far) { refs.current.forEach((im) => im?.setMatrixAt(k, HIDE)); return; }
      const swim = n.mode === "swim" || n.y < 0;
      pose({
        phase: n.phase, t: rt.t + n.id * 0.37, female: n.gender === "female", hairStyle: n.hairStyle,
        amp: Math.min(1.2, n.speed / 3.5),
        mode: n.mode === "dance" ? "dance" : n.mode === "sit" ? "sit" : swim ? "swim" : "walk",
      }, local);
      root.makeRotationFromEuler(e.set(swim ? 1.35 : n.mode === "stagger" ? -0.5 : 0, n.heading, 0, "YXZ"));
      root.setPosition(n.x, n.y, n.z);
      refs.current.forEach((im, i) => im?.setMatrixAt(k, m.multiplyMatrices(root, local[i]!)));
    });
    refs.current.forEach((im) => { if (im) im.instanceMatrix.needsUpdate = true; });
  });

  return (
    <>
      {geos.map((g, i) => (
        <instancedMesh key={i} ref={(m) => { refs.current[i] = m; }} args={[g, mats[i], N]} frustumCulled={false} castShadow={i === 0} />
      ))}
    </>
  );
}
