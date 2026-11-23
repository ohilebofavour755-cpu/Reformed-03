import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { B, WATER_X, BEACH_X, chunkKind, chunkOf, building, hash2 } from "@/game/world";
import { groundTexture, facadeTextures } from "@/game/textures";
import { rt } from "@/game/runtime";
import { carVec } from "@/game/npcs";

const R = 5, MAX = (2 * R + 1) ** 2, N = 2 * R + 11;
export function City() {
  const ground = useMemo(() => { const t = groundTexture(); t.repeat.set(N, N); return t; }, []);
  const fac = useMemo(facadeTextures, []);
  const mats = useMemo(() => {
    const bld = new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.emissive, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.85 });
    const lamp = new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: new THREE.Color("#ffd27a"), emissiveIntensity: 0 });
    rt.mats.lamp = lamp; rt.mats.windows = bld;
    return {
      bld, lamp,
      roof: new THREE.MeshStandardMaterial({ color: "#6d665e", roughness: 0.9 }),
      trunk: new THREE.MeshStandardMaterial({ color: "#6b4a2f" }),
      leaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
      pole: new THREE.MeshStandardMaterial({ color: "#3b3e44", metalness: 0.5, roughness: 0.4 }),
      grass: new THREE.MeshStandardMaterial({ color: "#5f8f45", roughness: 1 }),
      car: new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.4, roughness: 0.35 }),
      glass: new THREE.MeshStandardMaterial({ color: "#1d2630", metalness: 0.6, roughness: 0.15 }),
    };
  }, [fac]);
  const geo = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    trunk: new THREE.CylinderGeometry(0.15, 0.22, 3, 6).translate(0, 1.5, 0),
    leaf: new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.8, 0),
    pole: new THREE.CylinderGeometry(0.08, 0.1, 5, 6).translate(0, 2.5, 0),
    lamp: new THREE.SphereGeometry(0.3, 10, 8).translate(0, 5.1, 0),
    car: new THREE.BoxGeometry(1.9, 0.75, 4.2).translate(0, 0.65, 0),
    cab: new THREE.BoxGeometry(1.7, 0.65, 2.2).translate(0, 1.35, -0.2),
  }), []);
  const r = {
    ground: useRef<THREE.Mesh>(null), bld: useRef<THREE.InstancedMesh>(null), roof: useRef<THREE.InstancedMesh>(null),
    trunk: useRef<THREE.InstancedMesh>(null), leaf: useRef<THREE.InstancedMesh>(null), pole: useRef<THREE.InstancedMesh>(null),
    lamp: useRef<THREE.InstancedMesh>(null), grass: useRef<THREE.InstancedMesh>(null), beach: useRef<THREE.Group>(null),
    car: useRef<THREE.InstancedMesh>(null), cab: useRef<THREE.InstancedMesh>(null),
  };
  const last = useRef({ x: 1e9, z: 1e9 });
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler() }), []);

  function rebuild(cx: number, cz: number) {
    const { m, p, q, s, c } = tmp;
    q.identity();
    let bi = 0, ti = 0, li = 0, gi = 0;
    const tree = (x: number, z: number, scale: number, hue: number, palm = false) => {
      m.compose(p.set(x, 0, z), q, s.set(scale, palm ? scale * 1.6 : scale, scale)); r.trunk.current?.setMatrixAt(ti, m);
      m.compose(p.set(x, palm ? 2.5 * scale : 0, z), q, s.set(scale * (palm ? 1.3 : 1), scale * (palm ? 0.45 : 1), scale * (palm ? 1.3 : 1))); r.leaf.current?.setMatrixAt(ti, m);
      r.leaf.current?.setColorAt(ti, c.setHSL(0.25 + hue * 0.08, 0.45, 0.32 + hue * 0.1)); ti++;
    };
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      const x = cx + dx, z = cz + dz, wx = x * B, wz = z * B, k = chunkKind(x, z), h = hash2(x * 3, z * 5);
      if (k === "building") {
        const b = building(x, z);
        m.compose(p.set(wx, 0, wz), q, s.set(b.half * 2, b.h, b.half * 2)); r.bld.current?.setMatrixAt(bi, m);
        r.bld.current?.setColorAt(bi, c.set(b.color));
        m.compose(p.set(wx, b.h, wz), q, s.set(b.half * 2 + 0.5, 0.4, b.half * 2 + 0.5)); r.roof.current?.setMatrixAt(bi, m);
        bi++;
        tree(wx + 10, wz - 5, 0.8 + h * 0.4, h); tree(wx - 10, wz + 5, 0.8 + h * 0.3, 1 - h);
      } else if (k === "park") {
        m.compose(p.set(wx, 0, wz), q, s.set(18, 0.12, 18)); r.grass.current?.setMatrixAt(gi++, m);
        for (let i = 0; i < 6; i++) tree(wx + (hash2(x + i, z) - 0.5) * 15, wz + (hash2(z - i, x) - 0.5) * 15, 0.9 + hash2(i, x) * 0.6, hash2(x, i));
      } else if (k === "beach") {
        tree(wx + 8, wz - 8, 1.1, h, true); tree(wx + 2, wz + 9, 1, 1 - h, true);
      }
      if (k !== "water" && k !== "beach") {
        m.compose(p.set(wx + 10.4, 0, wz + 10.4), q, s.set(1, 1, 1));
        r.pole.current?.setMatrixAt(li, m); r.lamp.current?.setMatrixAt(li, m); li++;
      }
    }
    const fin = (im: THREE.InstancedMesh | null, n: number) => { if (!im) return; im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; };
    fin(r.bld.current, bi); fin(r.roof.current, bi); fin(r.trunk.current, ti); fin(r.leaf.current, ti);
    fin(r.pole.current, li); fin(r.lamp.current, li); fin(r.grass.current, gi);
    r.ground.current?.position.set(cx * B, 0, cz * B);
    if (r.beach.current) r.beach.current.position.z = cz * B;
  }

  useFrame(() => {
    const cx = chunkOf(rt.player.x), cz = chunkOf(rt.player.z);
    if (cx !== last.current.x || cz !== last.current.z) { last.current = { x: cx, z: cz }; rebuild(cx, cz); }
    const { m, p, q, s, e } = tmp;
    rt.cars.forEach((car, i) => {
      const [vx, vz] = carVec(car.dir);
      q.setFromEuler(e.set(0, Math.atan2(vx, vz), 0));
      m.compose(p.set(car.x, 0, car.z), q, s.set(1, 1, 1));
      r.car.current?.setMatrixAt(i, m); r.cab.current?.setMatrixAt(i, m);
    });
    if (r.car.current) r.car.current.instanceMatrix.needsUpdate = true;
    if (r.cab.current) r.cab.current.instanceMatrix.needsUpdate = true;
  });

  const carsInit = (im: THREE.InstancedMesh | null) => {
    r.car.current = im;
    if (!im) return;
    const c = new THREE.Color();
    rt.cars.forEach((car, i) => im.setColorAt(i, c.set(car.color)));
  };
  const leafInit = (im: THREE.InstancedMesh | null) => {
    r.leaf.current = im;
    if (im) im.setColorAt(0, new THREE.Color("#4d7a3a"));
  };
  const bldInit = (im: THREE.InstancedMesh | null) => {
    r.bld.current = im;
    if (im) im.setColorAt(0, new THREE.Color("#fff"));
  };

  return (
    <group>
      <mesh ref={r.ground} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[N * B, N * B]} />
        <meshStandardMaterial map={ground} roughness={0.95} />
      </mesh>
      <group ref={r.beach}>
        <mesh rotation-x={-Math.PI / 2} position={[(BEACH_X + WATER_X) / 2, 0.03, 0]} receiveShadow>
          <planeGeometry args={[WATER_X - BEACH_X + 2, 800]} />
          <meshStandardMaterial color="#e6cf9c" roughness={1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[WATER_X + 300, 0.25, 0]}>
          <planeGeometry args={[600, 800]} />
          <meshStandardMaterial color="#2f8fa3" roughness={0.12} metalness={0.25} transparent opacity={0.92} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[WATER_X + 1, 0.27, 0]}>
          <planeGeometry args={[2.5, 800]} />
          <meshStandardMaterial color="#d9f1ef" transparent opacity={0.5} />
        </mesh>
      </group>
      <instancedMesh ref={bldInit} args={[geo.box, mats.bld, MAX]} frustumCulled={false} castShadow receiveShadow />
      <instancedMesh ref={r.roof} args={[geo.box, mats.roof, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.grass} args={[geo.box, mats.grass, MAX]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={r.trunk} args={[geo.trunk, mats.trunk, MAX * 6]} frustumCulled={false} />
      <instancedMesh ref={leafInit} args={[geo.leaf, mats.leaf, MAX * 6]} frustumCulled={false} castShadow />
      <instancedMesh ref={r.pole} args={[geo.pole, mats.pole, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.lamp} args={[geo.lamp, mats.lamp, MAX]} frustumCulled={false} />
      <instancedMesh ref={carsInit} args={[geo.car, mats.car, rt.cars.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={r.cab} args={[geo.cab, mats.glass, rt.cars.length]} frustumCulled={false} />
    </group>
  );
}
