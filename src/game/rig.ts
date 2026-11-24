// Shared stylized human rig: sculpted head, facial features, distinct hair meshes, layered clothing,
// nails, tattoo ink meshes, articulated elbows/knees/ankles, and smooth walk/sit/sleep/dance/talk kinematics.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Slot = "shirt" | "pants" | "skin" | "hair" | "eye" | "shoe" | "lip" | "nail" | "tattoo";

export const PART_SLOT: Slot[] = [
  "shirt", // 0: torso
  "pants", // 1: hips/pelvis
  "pants", // 2: skirt/tunic overlay
  "shirt", // 3: L sleeve
  "shirt", // 4: R sleeve
  "skin", // 5: L upper arm
  "skin", // 6: R upper arm
  "skin", // 7: L forearm
  "skin", // 8: R forearm
  "skin", // 9: L hand
  "skin", // 10: R hand
  "pants", // 11: L thigh
  "pants", // 12: R thigh
  "pants", // 13: L shin
  "pants", // 14: R shin
  "shoe", // 15: L shoe
  "shoe", // 16: R shoe
  "skin", // 17: neck
  "skin", // 18: sculpted head
  "eye", // 19: L eye
  "eye", // 20: R eye
  "hair", // 21: L brow
  "hair", // 22: R brow
  "skin", // 23: nose
  "lip", // 24: lips/mouth
  "hair", // 25: hair style 0 (fade)
  "hair", // 26: hair style 1 (afro puff)
  "hair", // 27: hair style 2 (braids)
  "hair", // 28: hair style 3 (bob/bun)
  "nail", // 29: L hand nails
  "nail", // 30: R hand nails
  "tattoo", // 31: L/R forearm tattoo accent
  "tattoo", // 32: upper-arm tattoo band/sleeve
];

export const PART_COUNT = PART_SLOT.length;

function cleanMerge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(nonIndexed, false);
  nonIndexed.forEach((g) => g.dispose());
  return merged;
}

function buildHeadGeo(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.001, -0.155),
    new THREE.Vector2(0.075, -0.145),
    new THREE.Vector2(0.128, -0.095),
    new THREE.Vector2(0.148, -0.02),
    new THREE.Vector2(0.15, 0.045),
    new THREE.Vector2(0.135, 0.11),
    new THREE.Vector2(0.09, 0.152),
    new THREE.Vector2(0.001, 0.165),
  ];
  const g = new THREE.LatheGeometry(pts, 18);
  g.scale(0.95, 1.0, 1.02);
  return g;
}

function buildTorsoGeo(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.001, -0.22),
    new THREE.Vector2(0.16, -0.21),
    new THREE.Vector2(0.155, -0.08),
    new THREE.Vector2(0.185, 0.06),
    new THREE.Vector2(0.205, 0.16),
    new THREE.Vector2(0.145, 0.22),
    new THREE.Vector2(0.001, 0.23),
  ];
  const g = new THREE.LatheGeometry(pts, 16);
  g.scale(1.0, 1.0, 0.68);
  return g;
}

function buildShoeGeo(): THREE.BufferGeometry {
  const sole = new THREE.BoxGeometry(0.13, 0.035, 0.23).translate(0, -0.025, 0.045);
  const upper = new THREE.CapsuleGeometry(0.056, 0.09, 4, 8);
  upper.rotateX(Math.PI / 2);
  upper.translate(0, 0.015, 0.045);
  return cleanMerge([sole, upper]);
}

function buildHairFade(): THREE.BufferGeometry {
  const top = new THREE.CylinderGeometry(0.142, 0.152, 0.11, 16).translate(0, 0.13, -0.01);
  const back = new THREE.SphereGeometry(0.148, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58).translate(
    0,
    0.045,
    -0.02,
  );
  return cleanMerge([top, back]);
}

function buildHairAfro(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(0.175, 14, 12).translate(0, 0.09, -0.025),
    new THREE.SphereGeometry(0.11, 10, 8).translate(-0.11, 0.12, -0.02),
    new THREE.SphereGeometry(0.11, 10, 8).translate(0.11, 0.12, -0.02),
    new THREE.SphereGeometry(0.115, 10, 8).translate(0, 0.17, -0.04),
    new THREE.SphereGeometry(0.105, 10, 8).translate(0, 0.06, -0.12),
  ];
  return cleanMerge(parts);
}

function buildHairBraids(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(0.156, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(
      0,
      0.04,
      -0.015,
    ),
  ];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.28 + (i / 6) * Math.PI * 1.44;
    const bx = Math.sin(a) * 0.142;
    const bz = Math.cos(a) * 0.138 - 0.015;
    if (bz > 0.04) continue;
    const braid = new THREE.CapsuleGeometry(0.028, 0.25, 4, 6).translate(bx, -0.06, bz);
    parts.push(braid);
  }
  parts.push(new THREE.CapsuleGeometry(0.024, 0.22, 4, 6).translate(-0.145, -0.05, 0.02));
  parts.push(new THREE.CapsuleGeometry(0.024, 0.22, 4, 6).translate(0.145, -0.05, 0.02));
  return cleanMerge(parts);
}

function buildHairBun(): THREE.BufferGeometry {
  const cap = new THREE.SphereGeometry(0.154, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56).translate(
    0,
    0.04,
    -0.015,
  );
  const bun = new THREE.SphereGeometry(0.088, 12, 10).translate(0, 0.21, -0.065);
  const bangL = new THREE.CapsuleGeometry(0.032, 0.11, 4, 6)
    .rotateZ(0.25)
    .translate(-0.115, 0.05, 0.055);
  const bangR = new THREE.CapsuleGeometry(0.032, 0.11, 4, 6)
    .rotateZ(-0.25)
    .translate(0.115, 0.05, 0.055);
  return cleanMerge([cap, bun, bangL, bangR]);
}

function buildNailsGeo(): THREE.BufferGeometry {
  // 4 sculpted nail tips along outer edge of hand so nail polish shows cleanly
  const tips = [-0.024, -0.008, 0.008, 0.024].map((oz) =>
    new THREE.BoxGeometry(0.018, 0.022, 0.013).translate(0, -0.038, oz),
  );
  return cleanMerge(tips);
}

let cachedGeos: THREE.BufferGeometry[] | null = null;

export function rigGeometries(): THREE.BufferGeometry[] {
  if (cachedGeos) return cachedGeos;
  const mouth = new THREE.CapsuleGeometry(0.011, 0.034, 4, 6);
  mouth.rotateZ(Math.PI / 2);

  cachedGeos = [
    buildTorsoGeo(), // 0 torso
    new THREE.CylinderGeometry(0.165, 0.178, 0.18, 14), // 1 pelvis
    new THREE.CylinderGeometry(0.175, 0.29, 0.34, 14), // 2 skirt
    new THREE.SphereGeometry(0.072, 10, 8), // 3 L sleeve
    new THREE.SphereGeometry(0.072, 10, 8), // 4 R sleeve
    new THREE.CapsuleGeometry(0.052, 0.18, 4, 8), // 5 L upper arm
    new THREE.CapsuleGeometry(0.052, 0.18, 4, 8), // 6 R upper arm
    new THREE.CapsuleGeometry(0.044, 0.17, 4, 8), // 7 L forearm
    new THREE.CapsuleGeometry(0.044, 0.17, 4, 8), // 8 R forearm
    new THREE.SphereGeometry(0.048, 8, 6), // 9 L hand
    new THREE.SphereGeometry(0.048, 8, 6), // 10 R hand
    new THREE.CapsuleGeometry(0.082, 0.24, 4, 10), // 11 L thigh
    new THREE.CapsuleGeometry(0.082, 0.24, 4, 10), // 12 R thigh
    new THREE.CapsuleGeometry(0.066, 0.24, 4, 10), // 13 L shin
    new THREE.CapsuleGeometry(0.066, 0.24, 4, 10), // 14 R shin
    buildShoeGeo(), // 15 L shoe
    buildShoeGeo(), // 16 R shoe
    new THREE.CylinderGeometry(0.056, 0.066, 0.12, 10), // 17 neck
    buildHeadGeo(), // 18 head
    new THREE.SphereGeometry(0.022, 8, 6), // 19 L eye
    new THREE.SphereGeometry(0.022, 8, 6), // 20 R eye
    new THREE.BoxGeometry(0.048, 0.011, 0.016), // 21 L brow
    new THREE.BoxGeometry(0.048, 0.011, 0.016), // 22 R brow
    new THREE.CapsuleGeometry(0.013, 0.022, 4, 6), // 23 nose
    mouth, // 24 lips
    buildHairFade(), // 25 style 0
    buildHairAfro(), // 26 style 1
    buildHairBraids(), // 27 style 2
    buildHairBun(), // 28 style 3
    buildNailsGeo(), // 29 L hand nails
    buildNailsGeo(), // 30 R hand nails
    new THREE.CylinderGeometry(0.047, 0.047, 0.075, 10), // 31 forearm tattoo band
    new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10), // 32 upper-arm tattoo band/sleeve
  ];
  return cachedGeos;
}

export interface PoseIn {
  phase: number;
  amp: number;
  mode: "walk" | "dance" | "sit" | "swim" | "sleep";
  t: number;
  female: boolean;
  hairStyle: number;
  talking?: boolean;
  tattoo?: string;
}

const _m1 = new THREE.Matrix4();
const _v1 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _e1 = new THREE.Euler();
const _s1 = new THREE.Vector3();
const _sleepMat = new THREE.Matrix4();
const _lUpperMat = new THREE.Matrix4();
const _lForeMat = new THREE.Matrix4();
const _rForeMat = new THREE.Matrix4();
const _lHandMat = new THREE.Matrix4();
const _rHandMat = new THREE.Matrix4();

function setPart(
  out: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  _q1.setFromEuler(_e1.set(rx, ry, rz, "YXZ"));
  out.compose(_v1.set(x, y, z), _q1, _s1.set(sx, sy, sz));
}

function hide(out: THREE.Matrix4) {
  out.makeScale(0.0001, 0.0001, 0.0001);
}

function placeTwoSegmentLeg(
  outUpper: THREE.Matrix4,
  outLower: THREE.Matrix4,
  outFoot: THREE.Matrix4,
  hx: number,
  hy: number,
  hz: number,
  hipRx: number,
  kneeBend: number,
  footPitch = 0,
) {
  const thighLen = 0.37;
  const shinLen = 0.37;
  const kx = hx;
  const ky = hy - Math.cos(hipRx) * thighLen;
  const kz = hz - Math.sin(hipRx) * thighLen;
  setPart(outUpper, (hx + kx) * 0.5, (hy + ky) * 0.5, (hz + kz) * 0.5, hipRx, 0, 0);

  const lowerRx = hipRx + kneeBend;
  const ax = kx;
  const ay = ky - Math.cos(lowerRx) * shinLen;
  const az = kz - Math.sin(lowerRx) * shinLen;
  setPart(outLower, (kx + ax) * 0.5, (ky + ay) * 0.5, (kz + az) * 0.5, lowerRx, 0, 0);

  setPart(outFoot, ax, ay - 0.02, az, footPitch, 0, 0);
}

function placeTwoSegmentArm(
  outUpper: THREE.Matrix4,
  outLower: THREE.Matrix4,
  outHand: THREE.Matrix4,
  sx: number,
  sy: number,
  sz: number,
  armRx: number,
  armRz: number,
  elbowBend: number,
) {
  const uLen = 0.26;
  const fLen = 0.24;
  _e1.set(armRx, 0, armRz, "YXZ");
  _q1.setFromEuler(_e1);
  _v1.set(0, -uLen, 0).applyQuaternion(_q1);
  const ex = sx + _v1.x;
  const ey = sy + _v1.y;
  const ez = sz + _v1.z;
  outUpper.compose(
    _v1.set((sx + ex) * 0.5, (sy + ey) * 0.5, (sz + ez) * 0.5),
    _q1,
    _s1.set(1, 1, 1),
  );

  _e1.set(armRx + elbowBend, 0, armRz, "YXZ");
  _q1.setFromEuler(_e1);
  _v1.set(0, -fLen, 0).applyQuaternion(_q1);
  const wx = ex + _v1.x;
  const wy = ey + _v1.y;
  const wz = ez + _v1.z;
  outLower.compose(
    _v1.set((ex + wx) * 0.5, (ey + wy) * 0.5, (ez + wz) * 0.5),
    _q1,
    _s1.set(1, 1, 1),
  );
  outHand.compose(_v1.set(wx, wy, wz), _q1, _s1.set(0.85, 1.1, 0.75));
}

export const newPose = () => Array.from({ length: PART_COUNT }, () => new THREE.Matrix4());

export function pose(p: PoseIn, out: THREE.Matrix4[]) {
  let bounce = 0;
  let torsoRx = 0;
  let torsoRy = 0;
  let hipL = 0;
  let hipR = 0;
  let kneeL = 0;
  let kneeR = 0;
  let armLx = 0;
  let armRx = 0;
  let armLz = -0.14;
  let armRz = 0.14;
  let elbowL = -0.18;
  let elbowR = -0.18;
  let hipY = 0.84;

  const breath = Math.sin(p.t * 1.9) * 0.008;

  if (p.mode === "walk") {
    const s = Math.sin(p.phase) * p.amp;
    hipL = s * 0.62;
    hipR = -s * 0.62;
    kneeL = Math.max(0, -s) * 0.55 + p.amp * 0.08;
    kneeR = Math.max(0, s) * 0.55 + p.amp * 0.08;
    armLx = -s * 0.55;
    armRx = s * 0.55;
    elbowL = -0.22 - Math.max(0, s) * 0.45;
    elbowR = -0.22 - Math.max(0, -s) * 0.45;
    bounce = Math.abs(Math.cos(p.phase)) * 0.035 * p.amp + breath;
    torsoRy = s * 0.08;
  } else if (p.mode === "dance") {
    const k = p.t * 7.6;
    const groove = Math.sin(k);
    bounce = Math.abs(groove) * 0.07 - 0.04;
    hipL = groove * 0.28 - 0.18;
    hipR = -groove * 0.28 - 0.18;
    kneeL = 0.28 + Math.max(0, groove) * 0.25;
    kneeR = 0.28 + Math.max(0, -groove) * 0.25;
    armLz = -(0.55 + groove * 0.35);
    armRz = 0.55 + Math.cos(k) * 0.35;
    armLx = -0.55 + Math.sin(k * 0.5) * 0.35;
    armRx = -0.55 - Math.sin(k * 0.5) * 0.35;
    elbowL = -1.15 - Math.sin(k) * 0.3;
    elbowR = -1.15 - Math.cos(k) * 0.3;
    torsoRy = Math.sin(k * 0.5) * 0.18;
    torsoRx = 0.06;
  } else if (p.mode === "sit") {
    hipY = 0.45;
    bounce = breath * 0.5;
    hipL = -1.52;
    hipR = -1.52;
    kneeL = 1.52;
    kneeR = 1.52;
    armLx = -0.45;
    armRx = -0.45;
    armLz = -0.18;
    armRz = 0.18;
    elbowL = -0.75;
    elbowR = -0.75;
    torsoRx = -0.04;
  } else if (p.mode === "sleep") {
    hipY = 0.84;
    bounce = breath * 0.6;
    armLz = -0.18;
    armRz = 0.18;
    elbowL = -0.12;
    elbowR = -0.12;
  } else {
    hipL = Math.sin(p.t * 6) * 0.38;
    hipR = -hipL;
    kneeL = 0.18;
    kneeR = 0.18;
    armLx = Math.sin(p.t * 3) * 1.4 - 1.5;
    armRx = Math.sin(p.t * 3 + Math.PI) * 1.4 - 1.5;
    elbowL = -0.35;
    elbowR = -0.35;
  }

  const fw = p.female ? 0.88 : 1.0;
  const shoulderW = 0.235 * fw;
  const pelvisY = hipY + bounce;
  const torsoY = pelvisY + 0.28;
  const shoulderY = pelvisY + 0.48;
  const headY = pelvisY + 0.77;
  const headNod = p.talking
    ? Math.sin(p.t * 6.5) * 0.07
    : p.mode === "dance"
      ? Math.sin(p.t * 7.6) * 0.06
      : 0;

  setPart(out[0]!, 0, torsoY, 0, torsoRx, torsoRy, 0, fw, 1, 1);
  setPart(out[1]!, 0, pelvisY + 0.04, 0, 0, torsoRy * 0.5, 0, p.female ? 1.05 : 0.98, 1, 0.78);
  if (p.female)
    setPart(out[2]!, 0, pelvisY - 0.11, 0, torsoRx * 0.3, torsoRy * 0.4, 0, 1.0, 1, 0.82);
  else hide(out[2]!);

  setPart(out[3]!, -shoulderW, shoulderY - 0.01, 0, 0, torsoRy, 0, 1.05, 1.05, 1.05);
  setPart(out[4]!, shoulderW, shoulderY - 0.01, 0, 0, torsoRy, 0, 1.05, 1.05, 1.05);

  placeTwoSegmentArm(out[5]!, out[7]!, out[9]!, -shoulderW, shoulderY, 0, armLx, armLz, elbowL);
  placeTwoSegmentArm(out[6]!, out[8]!, out[10]!, shoulderW, shoulderY, 0, armRx, armRz, elbowR);

  // Copy hand/arm transforms for nails (29, 30) and tattoos (31, 32)
  _lHandMat.copy(out[9]!);
  _rHandMat.copy(out[10]!);
  out[29]!.copy(_lHandMat);
  out[30]!.copy(_rHandMat);

  _lForeMat.copy(out[7]!);
  _rForeMat.copy(out[8]!);
  _lUpperMat.copy(out[5]!);
  const tat = p.tattoo ?? "none";
  if (tat === "none") {
    hide(out[31]!);
    hide(out[32]!);
  } else if (tat === "wrist") {
    out[31]!.copy(_rForeMat).scale(_s1.set(1.03, 0.6, 1.03));
    hide(out[32]!);
  } else if (tat === "tribal") {
    hide(out[31]!);
    out[32]!.copy(_lUpperMat).scale(_s1.set(1.04, 0.75, 1.04));
  } else if (tat === "crown") {
    out[31]!.copy(_lForeMat).scale(_s1.set(1.05, 1.15, 1.05));
    out[32]!.copy(_lUpperMat).scale(_s1.set(1.03, 0.65, 1.03));
  } else if (tat === "phoenix") {
    out[31]!.copy(_rForeMat).scale(_s1.set(1.05, 1.4, 1.05));
    hide(out[32]!);
  } else {
    // sleeve
    out[31]!.copy(_lForeMat).scale(_s1.set(1.05, 1.85, 1.05));
    out[32]!.copy(_lUpperMat).scale(_s1.set(1.05, 1.55, 1.05));
  }

  const hipSep = p.female ? 0.092 : 0.102;
  placeTwoSegmentLeg(
    out[11]!,
    out[13]!,
    out[15]!,
    -hipSep,
    pelvisY - 0.04,
    0,
    hipL,
    kneeL,
    p.mode === "swim" ? 0.5 : 0,
  );
  placeTwoSegmentLeg(
    out[12]!,
    out[14]!,
    out[16]!,
    hipSep,
    pelvisY - 0.04,
    0,
    hipR,
    kneeR,
    p.mode === "swim" ? 0.5 : 0,
  );

  setPart(out[17]!, 0, torsoY + 0.25, 0.005);
  setPart(out[18]!, 0, headY, 0.01, headNod, torsoRy * 0.4, 0);

  const faceZ = 0.145;
  const eyeY = headY + 0.025;
  setPart(out[19]!, -0.052, eyeY, faceZ, headNod, 0, 0, 1.15, 1.3, 0.7);
  setPart(out[20]!, 0.052, eyeY, faceZ, headNod, 0, 0, 1.15, 1.3, 0.7);
  setPart(out[21]!, -0.052, eyeY + 0.042, faceZ - 0.004, headNod, 0, 0.12);
  setPart(out[22]!, 0.052, eyeY + 0.042, faceZ - 0.004, headNod, 0, -0.12);
  setPart(out[23]!, 0, headY - 0.008, faceZ + 0.012, headNod - 0.2, 0, 0);
  const lipSy = p.talking ? 1.0 + Math.abs(Math.sin(p.t * 15)) * 1.35 : 0.9;
  setPart(out[24]!, 0, headY - 0.068, faceZ - 0.004, headNod, 0, 0, 1.0, lipSy, 1.0);

  for (let s = 0; s < 4; s++) {
    const m = out[25 + s]!;
    if (p.hairStyle === s) setPart(m, 0, headY, 0.01, headNod, torsoRy * 0.4, 0);
    else hide(m);
  }

  if (p.mode === "sleep") {
    _q1.setFromEuler(_e1.set(Math.PI / 2, 0, 0, "YXZ"));
    _sleepMat.compose(_v1.set(0, 0.14, -0.82), _q1, _s1.set(1, 1, 1));
    for (let i = 0; i < PART_COUNT; i++) {
      _m1.multiplyMatrices(_sleepMat, out[i]!);
      out[i]!.copy(_m1);
    }
  }
}
