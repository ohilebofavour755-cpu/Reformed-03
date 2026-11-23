import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const pointers = import.meta.glob<{ default: { url: string } }>('../../assets/models/*.asset.json', { eager: true });
export function modelUrl(name: string) {
  return Object.entries(pointers).find(([p]) => p.endsWith(`/${name}.glb.asset.json`))?.[1].default.url;
}
export function LoadedModel({ url, size = [1, 1, 1], tint }: { url: string; size?: [number, number, number]; tint?: string }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const root = clone(scene);
    const box = new THREE.Box3().setFromObject(root), dim = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const scale = new THREE.Vector3(size[0] / Math.max(dim.x, .001), size[1] / Math.max(dim.y, .001), size[2] / Math.max(dim.z, .001));
    root.scale.copy(scale); root.position.set(-center.x * scale.x, -box.min.y * scale.y, -center.z * scale.z);
    root.traverse(n => { if (n instanceof THREE.Mesh) { n.castShadow = true; n.receiveShadow = true; if (tint && n.material instanceof THREE.MeshStandardMaterial) { n.material = n.material.clone(); n.material.color.set(tint); } } });
    return root;
  }, [scene, size[0], size[1], size[2], tint]);
  return <primitive object={object} />;
}
export function Model({ name, size, tint }: { name: string; size: [number, number, number]; tint?: string }) {
  const url = modelUrl(name);
  if (!url) return null;
  return <LoadedModel url={url} size={size} {...(tint ? { tint } : {})} />;
}
