// Shared Three.js materials and base geometries to avoid per-frame allocations and duplicate draw state.
import * as THREE from "three";

const matCache = new Map<string, THREE.MeshStandardMaterial>();

export function sharedMat(
  color: string,
  roughness = 0.8,
  metalness = 0,
  emissive?: string,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}|${emissive ?? ""}|${emissiveIntensity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...(emissive ? { emissive, emissiveIntensity } : {}),
    });
    matCache.set(key, m);
  }
  return m;
}

let unitBoxBottom: THREE.BoxGeometry | null = null;
export function getUnitBoxBottom(): THREE.BoxGeometry {
  if (!unitBoxBottom) {
    unitBoxBottom = new THREE.BoxGeometry(1, 1, 1);
    unitBoxBottom.translate(0, 0.5, 0);
  }
  return unitBoxBottom;
}

let unitBoxCenter: THREE.BoxGeometry | null = null;
export function getUnitBoxCenter(): THREE.BoxGeometry {
  if (!unitBoxCenter) unitBoxCenter = new THREE.BoxGeometry(1, 1, 1);
  return unitBoxCenter;
}

let unitCylinder: THREE.CylinderGeometry | null = null;
export function getUnitCylinder(): THREE.CylinderGeometry {
  if (!unitCylinder) unitCylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  return unitCylinder;
}

let unitSphere: THREE.SphereGeometry | null = null;
export function getUnitSphere(): THREE.SphereGeometry {
  if (!unitSphere) unitSphere = new THREE.SphereGeometry(0.5, 10, 8);
  return unitSphere;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || window.matchMedia?.("(pointer: coarse)")?.matches === true;
}
