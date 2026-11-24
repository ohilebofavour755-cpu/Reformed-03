import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const pointers = import.meta.glob<{ default: { url: string } }>(
  "../../assets/models/*.asset.json",
  { eager: true },
);
export function modelUrl(name: string) {
  return Object.entries(pointers).find(([p]) => p.endsWith(`/${name}.glb.asset.json`))?.[1].default
    .url;
}
export function LoadedModel({
  url,
  size = [1, 1, 1],
  tint,
  uniform = false,
}: {
  url: string;
  size?: [number, number, number];
  tint?: string;
  uniform?: boolean;
}) {
  const { scene } = useGLTF(url);
  const [sx, sy, sz] = size;
  const object = useMemo(() => {
    const root = clone(scene);
    const box = new THREE.Box3().setFromObject(root),
      dim = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    const scale = uniform
      ? new THREE.Vector3().setScalar(sy / Math.max(dim.y, 0.001))
      : new THREE.Vector3(
          sx / Math.max(dim.x, 0.001),
          sy / Math.max(dim.y, 0.001),
          sz / Math.max(dim.z, 0.001),
        );
    root.scale.copy(scale);
    root.position.set(-center.x * scale.x, -box.min.y * scale.y, -center.z * scale.z);
    root.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = false;
        n.receiveShadow = false;
        if (tint && n.material instanceof THREE.MeshStandardMaterial) {
          n.material = n.material.clone();
          n.material.color.set(tint);
        }
      }
    });
    return root;
  }, [scene, sx, sy, sz, tint, uniform]);
  return <primitive object={object} />;
}
export function Model({
  name,
  size,
  tint,
  uniform,
}: {
  name: string;
  size: [number, number, number];
  tint?: string;
  uniform?: boolean;
}) {
  const url = modelUrl(name);
  if (!url) return null;
  return <LoadedModel url={url} size={size} uniform={uniform} {...(tint ? { tint } : {})} />;
}
