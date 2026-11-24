import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  B,
  WATER_X,
  BEACH_X,
  ROAD_SAFETY_POSTS,
  chunkKind,
  chunkOf,
  building,
  hash2,
} from "@/game/world";
import { groundTexture, facadeTextures, signTexture } from "@/game/textures";
import { sharedMat, getUnitBoxBottom } from "@/game/materials";
import { rt } from "@/game/runtime";
import { carVec } from "@/game/npcs";

const R = 5,
  MAX = (2 * R + 1) ** 2,
  N = 2 * R + 11;

function cleanMerge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geos.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g;
    ni.deleteAttribute("uv");
    return ni;
  });
  const merged = mergeGeometries(nonIndexed, false);
  nonIndexed.forEach((g) => g.dispose());
  return merged;
}

function buildLushTreeTrunk(): THREE.BufferGeometry {
  const main = new THREE.CylinderGeometry(0.16, 0.28, 2.7, 7).translate(0, 1.35, 0);
  const b1 = new THREE.CylinderGeometry(0.08, 0.13, 1.3, 6)
    .rotateZ(0.48)
    .translate(-0.34, 2.35, 0.1);
  const b2 = new THREE.CylinderGeometry(0.08, 0.13, 1.25, 6)
    .rotateZ(-0.46)
    .rotateY(1.1)
    .translate(0.32, 2.3, -0.12);
  return cleanMerge([main, b1, b2]);
}

function buildLushTreeCanopy(): THREE.BufferGeometry {
  const puffs = [
    new THREE.SphereGeometry(1.35, 9, 7).translate(0, 3.65, 0),
    new THREE.SphereGeometry(1.05, 8, 6).translate(-0.78, 3.25, 0.42),
    new THREE.SphereGeometry(1.05, 8, 6).translate(0.82, 3.3, -0.35),
    new THREE.SphereGeometry(0.98, 8, 6).translate(0.15, 3.2, 0.78),
    new THREE.SphereGeometry(0.95, 8, 6).translate(-0.22, 3.25, -0.76),
    new THREE.SphereGeometry(0.92, 8, 6).translate(0, 4.45, 0),
  ];
  return cleanMerge(puffs);
}

function buildPalmTrunk(): THREE.BufferGeometry {
  const segs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const rBot = 0.22 - t * 0.09;
    const rTop = 0.19 - t * 0.08;
    const xOff = Math.sin(t * 1.1) * 0.35;
    const s = new THREE.CylinderGeometry(rTop, rBot, 0.85, 7)
      .rotateZ(-0.08 + t * 0.04)
      .translate(xOff, 0.42 + i * 0.78, 0);
    segs.push(s);
  }
  return cleanMerge(segs);
}

function buildPalmFronds(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(0.28, 7, 6).translate(0.32, 4.95, 0),
  ];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const frond = new THREE.BoxGeometry(0.38, 0.07, 1.85);
    frond.translate(0, 0, 0.95);
    frond.rotateX(0.32 + (i % 2) * 0.12);
    frond.rotateY(a);
    frond.translate(0.32, 5.05, 0);
    parts.push(frond);

    const tip = new THREE.BoxGeometry(0.24, 0.05, 1.1);
    tip.translate(0, -0.25, 2.25);
    tip.rotateX(0.55);
    tip.rotateY(a);
    tip.translate(0.32, 4.95, 0);
    parts.push(tip);
  }
  return cleanMerge(parts);
}

function buildCarWheelsGeo(): THREE.BufferGeometry {
  const positions: [number, number, number][] = [
    [-0.92, 0.32, 1.3],
    [0.92, 0.32, 1.3],
    [-0.92, 0.32, -1.3],
    [0.92, 0.32, -1.3],
  ];
  const wheels = positions.map(([wx, wy, wz]) =>
    new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12).rotateZ(Math.PI / 2).translate(wx, wy, wz),
  );
  return cleanMerge(wheels);
}

function buildCarLightsGeo(): THREE.BufferGeometry {
  return cleanMerge([
    new THREE.BoxGeometry(0.34, 0.14, 0.08).translate(-0.66, 0.56, 2.12),
    new THREE.BoxGeometry(0.34, 0.14, 0.08).translate(0.66, 0.56, 2.12),
  ]);
}

function RoadSafetyPost({
  x,
  z,
  rotY,
  label,
}: {
  x: number;
  z: number;
  rotY: number;
  label: string;
}) {
  const tex = useMemo(() => signTexture(label, "#14532d", "#fef08a"), [label]);
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* Orange & White Jersey Barrier */}
      <mesh
        position={[0, 0, 0]}
        scale={[1.5, 0.55, 0.38]}
        geometry={getUnitBoxBottom()}
        material={sharedMat("#f97316", 0.7)}
      />
      <mesh
        position={[0, 0.18, 0]}
        scale={[0.55, 0.24, 0.4]}
        geometry={getUnitBoxBottom()}
        material={sharedMat("#f8fafc", 0.7)}
      />
      {/* Safety Cones */}
      {[-1.05, 1.05].map((cx) => (
        <mesh key={cx} position={[cx, 0.28, 0]} material={sharedMat("#ea580c", 0.6)}>
          <coneGeometry args={[0.18, 0.56, 8]} />
        </mesh>
      ))}
      {/* FRSC Signboard */}
      <mesh
        position={[0, 0, -0.35]}
        scale={[0.08, 2.3, 0.08]}
        geometry={getUnitBoxBottom()}
        material={sharedMat("#475569", 0.5, 0.4)}
      />
      <mesh position={[0, 2.15, -0.3]}>
        <planeGeometry args={[1.65, 0.42]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}

export function City() {
  const ground = useMemo(() => {
    const t = groundTexture();
    t.repeat.set(N, N);
    return t;
  }, []);
  const fac = useMemo(facadeTextures, []);
  const mats = useMemo(() => {
    const bld = new THREE.MeshStandardMaterial({
      map: fac.map,
      emissiveMap: fac.emissive,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0,
      roughness: 0.85,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: "#fff3c4",
      emissive: new THREE.Color("#ffd27a"),
      emissiveIntensity: 0,
    });
    rt.mats.lamp = lamp;
    rt.mats.windows = bld;
    return {
      bld,
      lamp,
      roof: new THREE.MeshStandardMaterial({ color: "#6d665e", roughness: 0.9 }),
      trunk: new THREE.MeshStandardMaterial({ color: "#6b4a2f", roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88 }),
      palmTrunk: new THREE.MeshStandardMaterial({ color: "#7b5839", roughness: 0.92 }),
      palmLeaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82 }),
      pole: new THREE.MeshStandardMaterial({ color: "#3b3e44", metalness: 0.5, roughness: 0.4 }),
      grass: new THREE.MeshStandardMaterial({ color: "#5f8f45", roughness: 1 }),
      car: new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.35, roughness: 0.35 }),
      glass: new THREE.MeshStandardMaterial({ color: "#1d2a38", metalness: 0.55, roughness: 0.16 }),
      wheel: new THREE.MeshStandardMaterial({ color: "#191c22", roughness: 0.82 }),
      headlight: new THREE.MeshStandardMaterial({
        color: "#fff8db",
        emissive: "#ffe596",
        emissiveIntensity: 1.0,
      }),
      trim: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45 }),
    };
  }, [fac]);

  const geo = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      trunk: buildLushTreeTrunk(),
      leaf: buildLushTreeCanopy(),
      palmTrunk: buildPalmTrunk(),
      palmLeaf: buildPalmFronds(),
      pole: new THREE.CylinderGeometry(0.08, 0.1, 5, 6).translate(0, 2.5, 0),
      lamp: new THREE.SphereGeometry(0.3, 10, 8).translate(0, 5.1, 0),
      carBody: new THREE.BoxGeometry(1.94, 0.62, 4.25).translate(0, 0.54, 0),
      carCab: new THREE.BoxGeometry(1.66, 0.56, 2.25).translate(0, 1.12, -0.15),
      carWheels: buildCarWheelsGeo(),
      carLights: buildCarLightsGeo(),
      carAccent: new THREE.BoxGeometry(1.96, 0.18, 1.45).translate(0, 0.88, -0.15),
    }),
    [],
  );

  const r = {
    ground: useRef<THREE.Mesh>(null),
    bld: useRef<THREE.InstancedMesh>(null),
    roof: useRef<THREE.InstancedMesh>(null),
    trunk: useRef<THREE.InstancedMesh>(null),
    leaf: useRef<THREE.InstancedMesh>(null),
    palmTrunk: useRef<THREE.InstancedMesh>(null),
    palmLeaf: useRef<THREE.InstancedMesh>(null),
    pole: useRef<THREE.InstancedMesh>(null),
    lamp: useRef<THREE.InstancedMesh>(null),
    grass: useRef<THREE.InstancedMesh>(null),
    beach: useRef<THREE.Group>(null),
    carBody: useRef<THREE.InstancedMesh>(null),
    carCab: useRef<THREE.InstancedMesh>(null),
    carWheels: useRef<THREE.InstancedMesh>(null),
    carLights: useRef<THREE.InstancedMesh>(null),
    carAccent: useRef<THREE.InstancedMesh>(null),
  };

  const last = useRef({ x: 1e9, z: 1e9 });
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      c: new THREE.Color(),
      e: new THREE.Euler(),
    }),
    [],
  );

  function rebuild(cx: number, cz: number) {
    const { m, p, q, s, c, e } = tmp;
    let bi = 0,
      ti = 0,
      pi = 0,
      li = 0,
      gi = 0;

    const addStreetTree = (x: number, z: number, scale: number, hue: number) => {
      q.setFromEuler(e.set(0, hue * Math.PI * 2, 0));
      m.compose(p.set(x, 0, z), q, s.set(scale, scale, scale));
      r.trunk.current?.setMatrixAt(ti, m);
      r.leaf.current?.setMatrixAt(ti, m);
      r.leaf.current?.setColorAt(ti, c.setHSL(0.28 + hue * 0.07, 0.5, 0.28 + hue * 0.1));
      ti++;
    };

    const addPalmTree = (x: number, z: number, scale: number, hue: number) => {
      q.setFromEuler(e.set(0, hue * Math.PI * 2, 0));
      m.compose(p.set(x, 0, z), q, s.set(scale, scale, scale));
      r.palmTrunk.current?.setMatrixAt(pi, m);
      r.palmLeaf.current?.setMatrixAt(pi, m);
      r.palmLeaf.current?.setColorAt(pi, c.setHSL(0.29 + hue * 0.05, 0.56, 0.32 + hue * 0.08));
      pi++;
    };

    for (let dx = -R; dx <= R; dx++)
      for (let dz = -R; dz <= R; dz++) {
        const x = cx + dx,
          z = cz + dz,
          wx = x * B,
          wz = z * B,
          k = chunkKind(x, z),
          h = hash2(x * 3, z * 5);
        if (k === "building") {
          const b = building(x, z);
          q.identity();
          m.compose(p.set(wx, 0, wz), q, s.set(b.half * 2, b.h, b.half * 2));
          r.bld.current?.setMatrixAt(bi, m);
          r.bld.current?.setColorAt(bi, c.set(b.color));
          m.compose(p.set(wx, b.h, wz), q, s.set(b.half * 2 + 0.5, 0.4, b.half * 2 + 0.5));
          r.roof.current?.setMatrixAt(bi, m);
          bi++;
          addStreetTree(wx + 10, wz - 5, 0.85 + h * 0.35, h);
          addStreetTree(wx - 10, wz + 5, 0.85 + h * 0.3, 1 - h);
        } else if (k === "park") {
          q.identity();
          m.compose(p.set(wx, 0, wz), q, s.set(18, 0.12, 18));
          r.grass.current?.setMatrixAt(gi++, m);
          for (let i = 0; i < 6; i++)
            addStreetTree(
              wx + (hash2(x + i, z) - 0.5) * 15,
              wz + (hash2(z - i, x) - 0.5) * 15,
              0.9 + hash2(i, x) * 0.55,
              hash2(x, i),
            );
        } else if (k === "beach") {
          addPalmTree(wx + 8, wz - 8, 1.05 + h * 0.2, h);
          addPalmTree(wx + 2, wz + 9, 0.95 + h * 0.25, 1 - h);
          addPalmTree(wx - 9.5, wz - 3, 1.0, hash2(z, x));
        }
        if (k !== "water" && k !== "beach") {
          q.identity();
          m.compose(p.set(wx + 10.4, 0, wz + 10.4), q, s.set(1, 1, 1));
          r.pole.current?.setMatrixAt(li, m);
          r.lamp.current?.setMatrixAt(li, m);
          li++;
        }
      }

    const fin = (im: THREE.InstancedMesh | null, n: number) => {
      if (!im) return;
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    };
    fin(r.bld.current, bi);
    fin(r.roof.current, bi);
    fin(r.trunk.current, ti);
    fin(r.leaf.current, ti);
    fin(r.palmTrunk.current, pi);
    fin(r.palmLeaf.current, pi);
    fin(r.pole.current, li);
    fin(r.lamp.current, li);
    fin(r.grass.current, gi);

    // Clamp east edge of road/ground plane strictly at x <= 48 so road markings NEVER extend onto beach sand or water
    r.ground.current?.position.set(Math.min(cx, -9) * B, 0, cz * B);
    if (r.beach.current) r.beach.current.position.z = cz * B;
  }

  useFrame(() => {
    const cx = chunkOf(rt.player.x),
      cz = chunkOf(rt.player.z);
    if (cx !== last.current.x || cz !== last.current.z) {
      last.current = { x: cx, z: cz };
      rebuild(cx, cz);
    }
    const { m, p, q, s, e } = tmp;
    rt.cars.forEach((car, i) => {
      const [vx, vz] = carVec(car.dir);
      q.setFromEuler(e.set(0, Math.atan2(vx, vz), 0));
      const sy = car.variant === "danfo" ? 1.38 : car.variant === "suv" ? 1.15 : 1.0;
      const sx = car.variant === "danfo" ? 1.04 : 1.0;
      m.compose(p.set(car.x, 0, car.z), q, s.set(sx, sy, 1));
      r.carBody.current?.setMatrixAt(i, m);
      r.carCab.current?.setMatrixAt(i, m);
      r.carWheels.current?.setMatrixAt(i, m);
      r.carLights.current?.setMatrixAt(i, m);
      r.carAccent.current?.setMatrixAt(i, m);
    });
    if (r.carBody.current) r.carBody.current.instanceMatrix.needsUpdate = true;
    if (r.carCab.current) r.carCab.current.instanceMatrix.needsUpdate = true;
    if (r.carWheels.current) r.carWheels.current.instanceMatrix.needsUpdate = true;
    if (r.carLights.current) r.carLights.current.instanceMatrix.needsUpdate = true;
    if (r.carAccent.current) r.carAccent.current.instanceMatrix.needsUpdate = true;
  });

  const carsInit = (im: THREE.InstancedMesh | null) => {
    r.carBody.current = im;
    if (!im) return;
    const c = new THREE.Color();
    rt.cars.forEach((car, i) => im.setColorAt(i, c.set(car.color)));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  const carAccentInit = (im: THREE.InstancedMesh | null) => {
    r.carAccent.current = im;
    if (!im) return;
    const c = new THREE.Color();
    rt.cars.forEach((car, i) =>
      im.setColorAt(
        i,
        c.set(
          car.variant === "police" ? "#f8fafc" : car.variant === "danfo" ? "#171717" : car.color,
        ),
      ),
    );
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  const leafInit = (im: THREE.InstancedMesh | null) => {
    r.leaf.current = im;
    if (im) im.setColorAt(0, new THREE.Color("#3b6e34"));
  };
  const palmLeafInit = (im: THREE.InstancedMesh | null) => {
    r.palmLeaf.current = im;
    if (im) im.setColorAt(0, new THREE.Color("#3a7c38"));
  };
  const bldInit = (im: THREE.InstancedMesh | null) => {
    r.bld.current = im;
    if (im) im.setColorAt(0, new THREE.Color("#fff"));
  };

  return (
    <group>
      <mesh ref={r.ground} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[N * B, N * B]} />
        <meshStandardMaterial map={ground} roughness={0.95} />
      </mesh>
      <group ref={r.beach}>
        {/* Coastal avenue east shoulder & curb stopping strictly before beach sand (x = 48..53) */}
        <mesh rotation-x={-Math.PI / 2} position={[50.5, 0.015, 0]}>
          <planeGeometry args={[5.2, 800]} />
          <meshStandardMaterial color="#36383c" roughness={0.95} />
        </mesh>
        <mesh position={[53.05, 0.09, 0]}>
          <boxGeometry args={[0.35, 0.18, 800]} />
          <meshStandardMaterial color="#c4bba9" roughness={0.92} />
        </mesh>
        {/* Pure opaque golden beach sand */}
        <mesh rotation-x={-Math.PI / 2} position={[(BEACH_X + WATER_X) / 2, 0.04, 0]}>
          <planeGeometry args={[WATER_X - BEACH_X + 2, 800]} />
          <meshStandardMaterial color="#e6cf9c" roughness={1} />
        </mesh>
        {/* 100% opaque pure ocean water — zero road lines or ground bleed-through */}
        <mesh rotation-x={-Math.PI / 2} position={[WATER_X + 320, 0.25, 0]}>
          <planeGeometry args={[640, 800]} />
          <meshStandardMaterial color="#1f7f96" roughness={0.22} metalness={0.14} />
        </mesh>
        {/* Deep coastal water band & gentle shoreline surf */}
        <mesh rotation-x={-Math.PI / 2} position={[WATER_X + 12, 0.255, 0]}>
          <planeGeometry args={[24, 800]} />
          <meshStandardMaterial color="#2b96ad" roughness={0.26} metalness={0.1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[WATER_X + 0.8, 0.26, 0]}>
          <planeGeometry args={[1.8, 800]} />
          <meshStandardMaterial color="#d4f1f4" roughness={0.45} />
        </mesh>
      </group>

      {/* Road Safety (FRSC) Checkpoints */}
      {ROAD_SAFETY_POSTS.map((post) => (
        <RoadSafetyPost key={post.id} x={post.x} z={post.z} rotY={post.rotY} label={post.label} />
      ))}

      <instancedMesh ref={bldInit} args={[geo.box, mats.bld, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.roof} args={[geo.box, mats.roof, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.grass} args={[geo.box, mats.grass, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.trunk} args={[geo.trunk, mats.trunk, MAX * 6]} frustumCulled={false} />
      <instancedMesh ref={leafInit} args={[geo.leaf, mats.leaf, MAX * 6]} frustumCulled={false} />
      <instancedMesh
        ref={r.palmTrunk}
        args={[geo.palmTrunk, mats.palmTrunk, MAX * 3]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={palmLeafInit}
        args={[geo.palmLeaf, mats.palmLeaf, MAX * 3]}
        frustumCulled={false}
      />
      <instancedMesh ref={r.pole} args={[geo.pole, mats.pole, MAX]} frustumCulled={false} />
      <instancedMesh ref={r.lamp} args={[geo.lamp, mats.lamp, MAX]} frustumCulled={false} />
      <instancedMesh
        ref={carsInit}
        args={[geo.carBody, mats.car, rt.cars.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={r.carCab}
        args={[geo.carCab, mats.glass, rt.cars.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={r.carWheels}
        args={[geo.carWheels, mats.wheel, rt.cars.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={r.carLights}
        args={[geo.carLights, mats.headlight, rt.cars.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={carAccentInit}
        args={[geo.carAccent, mats.trim, rt.cars.length]}
        frustumCulled={false}
      />
    </group>
  );
}
