// Shared humanoid rig: rounded body parts and a pose function (local matrices).
import * as THREE from "three";

export type Slot = "shirt" | "pants" | "skin" | "hair" | "eye";
export const PART_SLOT: Slot[] = ["shirt", "pants", "pants", "pants", "skin", "skin", "skin", "hair", "pants", "eye", "eye", "shirt", "shirt"];
export function rigGeometries(): THREE.BufferGeometry[] {
  return [
    new THREE.CapsuleGeometry(0.2, 0.32, 6, 14),
    new THREE.CylinderGeometry(0.18, 0.2, 0.2, 14),
    new THREE.CapsuleGeometry(0.085, 0.62, 4, 10),
    new THREE.CapsuleGeometry(0.085, 0.62, 4, 10),
    new THREE.CapsuleGeometry(0.06, 0.46, 4, 10),
    new THREE.CapsuleGeometry(0.06, 0.46, 4, 10),
    new THREE.SphereGeometry(0.15, 18, 14),
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.CylinderGeometry(0.19, 0.34, 0.45, 16),
    new THREE.SphereGeometry(0.024, 8, 6),
    new THREE.SphereGeometry(0.024, 8, 6),
    new THREE.SphereGeometry(0.075, 10, 8), // sleeves
    new THREE.SphereGeometry(0.075, 10, 8),
  ];
}
export const PART_COUNT = 13;
export interface PoseIn { phase: number; amp: number; mode: "walk" | "dance" | "sit" | "swim"; t: number; female: boolean; hairStyle: number }

const R = new THREE.Matrix4(), T = new THREE.Matrix4();
function put(o: THREE.Matrix4, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
  o.makeScale(sx, sy, sz); o.setPosition(x, y, z);
}
function limb(o: THREE.Matrix4, x: number, y: number, z: number, rx: number, rz: number, half: number) {
  o.makeTranslation(x, y, z);
  R.makeRotationZ(rz); o.multiply(R);
  R.makeRotationX(rx); o.multiply(R);
  T.makeTranslation(0, -half, 0); o.multiply(T);
}
export const newPose = () => Array.from({ length: PART_COUNT }, () => new THREE.Matrix4());

export function pose(p: PoseIn, out: THREE.Matrix4[]) {
  let b = 0, lL = 0, lR = 0, aLx = 0, aRx = 0, aLz = -0.12, aRz = 0.12;
  if (p.mode === "walk") {
    const s = Math.sin(p.phase) * p.amp;
    lL = s * 0.7; lR = -s * 0.7; aLx = -s * 0.6; aRx = s * 0.6;
    b = Math.abs(Math.cos(p.phase)) * 0.04 * p.amp + Math.sin(p.t * 1.7) * 0.006;
  } else if (p.mode === "dance") {
    const k = p.t * 7.6;
    b = Math.abs(Math.sin(k)) * 0.08;
    lL = Math.sin(k) * 0.3; lR = -lL;
    aLz = -(2.2 + Math.sin(k) * 0.45); aRz = 2.2 + Math.cos(k) * 0.45;
    aLx = Math.sin(k * 0.5) * 0.3; aRx = -aLx;
  } else if (p.mode === "sit") {
    b = -0.42; lL = lR = -1.45; aLx = aRx = -0.5;
  } else {
    lL = Math.sin(p.t * 6) * 0.4; lR = -lL;
    aLx = Math.sin(p.t * 3) * 1.6 - 1.6; aRx = Math.sin(p.t * 3 + Math.PI) * 1.6 - 1.6;
  }
  const fw = p.female ? 0.88 : 1;
  put(out[0]!, 0, 1.18 + b, 0, fw, 1, 0.72);
  put(out[1]!, 0, 0.9 + b, 0, p.female ? 1.1 : 1, 1, 0.8);
  limb(out[2]!, -0.1, 0.88 + b, 0, lL, 0, 0.4);
  limb(out[3]!, 0.1, 0.88 + b, 0, lR, 0, 0.4);
  limb(out[4]!, -0.26 * fw, 1.42 + b, 0, aLx, aLz, 0.29);
  limb(out[5]!, 0.26 * fw, 1.42 + b, 0, aRx, aRz, 0.29);
  put(out[6]!, 0, 1.72 + b, 0.01, 1, 1.12, 1.02);
  const hy = 1.72 + b;
  switch (p.hairStyle) {
    case 0: put(out[7]!, 0, hy + 0.06, -0.012, 1.03, 0.72, 1.05); break;
    case 1: put(out[7]!, 0, hy + 0.09, -0.02, 1.45, 1.22, 1.42); break;
    case 2: put(out[7]!, 0, hy - 0.04, -0.05, 1.08, 1.4, 1.02); break;
    case 3: put(out[7]!, 0, hy + 0.12, -0.08, 1.05, 1.0, 1.1); break;
    default: put(out[7]!, 0, hy, 0, 0.001, 0.001, 0.001);
  }
  if (p.female) put(out[8]!, 0, 0.74 + b, 0, 1, 1, 0.85); else put(out[8]!, 0, 0, 0, 0.001, 0.001, 0.001);
  put(out[9]!, -0.052, 1.75 + b, 0.137);
  put(out[10]!, 0.052, 1.75 + b, 0.137);
  put(out[11]!, -0.25 * fw, 1.4 + b, 0, 1.15, 1.2, 1.15);
  put(out[12]!, 0.25 * fw, 1.4 + b, 0, 1.15, 1.2, 1.15);
}
