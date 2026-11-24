import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rigGeometries, PART_SLOT, pose, newPose } from "@/game/rig";
import { sharedMat } from "@/game/materials";
import { rt } from "@/game/runtime";
import type { Npc } from "@/game/npcs";
import {
  cloneGlbTemplate,
  getCachedGlb,
  preloadAllCharacterGlbs,
  subscribeGlbRegistry,
  type GlbRoleKey,
  type GlbTemplate,
} from "@/game/glbRegistry";

const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

function glbKeyForNpc(n: Npc): GlbRoleKey | null {
  switch (n.role) {
    case "police":
      return "police";
    case "trampoline":
      return "trampoline";
    case "thug":
      return "beachmale";
    case "beach":
      return "beach";
    case "hookup":
    case "club":
      return "ch";
    case "walker":
    case "market":
    case "school":
    case "church":
      return n.gender === "male" ? "mannpc" : "femalenpc";
    default:
      return null;
  }
}

function GlbNpcInstance({ npc, tpl }: { npc: Npc; tpl: GlbTemplate }) {
  const groupRef = useRef<THREE.Group>(null);
  const { cloneRoot, mixer, bounceChild, bounceBaseY } = useMemo(() => {
    const cloned = cloneGlbTemplate(tpl);
    let childToBounce: THREE.Object3D | null = null;
    let baseY = 0;
    if (tpl.key === "trampoline") {
      cloned.traverse((obj) => {
        if (!childToBounce && /girl|v28|jumper/i.test(obj.name)) {
          childToBounce = obj;
          baseY = obj.position.y;
        }
      });
    }
    let animMixer: THREE.AnimationMixer | null = null;
    if (tpl.animations.length > 0) {
      animMixer = new THREE.AnimationMixer(cloned);
      const clip =
        tpl.animations.find((c) => /walk|run|dance|idle/i.test(c.name)) ?? tpl.animations[0];
      if (clip) animMixer.clipAction(clip).play();
    }
    return {
      cloneRoot: cloned,
      mixer: animMixer,
      bounceChild: childToBounce,
      bounceBaseY: baseY,
    };
  }, [tpl]);

  useEffect(() => {
    return () => {
      mixer?.stopAllAction();
    };
  }, [mixer]);

  useFrame((_, raw) => {
    const g = groupRef.current;
    if (!g) return;
    const px = rt.player.x;
    const pz = rt.player.z;
    const far = Math.abs(npc.x - px) > 85 || Math.abs(npc.z - pz) > 85;
    if (npc.mode === "off" || far) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const dt = Math.min(raw, 0.067);
    if (mixer) mixer.update(dt * (npc.speed > 0.2 ? 1.15 : 0.7));

    const swim = npc.mode === "swim" || npc.y < 0;
    const moving = npc.speed > 0.15;
    const moveAmp = moving ? Math.min(1, npc.speed / 2.2) : 0;
    const strideBob =
      tpl.key === "trampoline" ? 0 : Math.abs(Math.sin(npc.phase)) * 0.045 * moveAmp;
    const danceBob = npc.mode === "dance" ? Math.abs(Math.sin(rt.t * 7.2 + npc.id)) * 0.06 : 0;

    if (bounceChild) {
      // Trampoline girl bounces up/down while the trampoline base stays grounded at y = 0
      const jumpWave = Math.abs(Math.sin(rt.t * 4.4 + npc.phase));
      bounceChild.position.y = bounceBaseY + jumpWave * 0.9;
    } else if (tpl.key === "trampoline") {
      // Fallback if named child missing
      g.position.set(npc.x, Math.abs(Math.sin(rt.t * 4.4 + npc.phase)) * 0.45, npc.z);
      g.rotation.set(0, npc.heading, 0, "YXZ");
      return;
    }

    const swayZ =
      npc.mode === "dance"
        ? Math.sin(rt.t * 6.5 + npc.id) * 0.08
        : Math.sin(npc.phase) * 0.038 * moveAmp;
    const leanX = swim ? 1.35 : npc.mode === "stagger" ? -0.42 : moving ? 0.04 * moveAmp : 0;

    g.position.set(npc.x, npc.y + strideBob + danceBob, npc.z);
    g.rotation.set(leanX, npc.heading, swayZ, "YXZ");
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloneRoot} />
    </group>
  );
}

function GlbBicycleProp({ npc, tpl }: { npc: Npc; tpl: GlbTemplate }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => cloneGlbTemplate(tpl), [tpl]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const far = Math.abs(npc.x - rt.player.x) > 85 || Math.abs(npc.z - rt.player.z) > 85;
    if (npc.mode === "off" || far) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(npc.x, 0, npc.z);
    g.rotation.set(0, npc.heading, Math.sin(npc.phase * 0.4) * 0.03, "YXZ");
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

export function Crowd({ npcs }: { npcs?: Npc[] }) {
  const sourceNpcs = npcs ?? rt.npcs;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    preloadAllCharacterGlbs();
    return subscribeGlbRegistry(() => setVersion((v) => v + 1));
  }, []);

  const { glbActors, bicycleRiders, fallbackNpcs } = useMemo(() => {
    void version;
    const actors: { npc: Npc; tpl: GlbTemplate }[] = [];
    const bikeTpl = getCachedGlb("bicycle");
    const riders: { npc: Npc; tpl: GlbTemplate }[] = [];
    const fallback: Npc[] = [];

    for (const n of sourceNpcs) {
      const key = glbKeyForNpc(n);
      const tpl = key ? getCachedGlb(key) : null;
      if (tpl) {
        actors.push({ npc: n, tpl });
      } else {
        fallback.push(n);
      }
      if (n.role === "bicyclist" && bikeTpl) {
        riders.push({ npc: n, tpl: bikeTpl });
      }
    }
    return { glbActors: actors, bicycleRiders: riders, fallbackNpcs: fallback };
  }, [sourceNpcs, version]);

  const geos = useMemo(rigGeometries, []);
  const mats = useMemo(
    () =>
      PART_SLOT.map((slot) => {
        if (slot === "eye") return sharedMat("#140d0a", 0.25, 0.1);
        if (slot === "shoe") return sharedMat("#22252b", 0.7, 0.05);
        if (slot === "lip") return sharedMat("#8c4a45", 0.45, 0);
        if (slot === "tattoo") return sharedMat("#182028", 0.65, 0);
        return new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: slot === "skin" || slot === "nail" ? 0.55 : 0.78,
        });
      }),
    [],
  );

  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const N = Math.max(1, fallbackNpcs.length);
  const local = useMemo(newPose, []);
  const tmp = useMemo(
    () => ({
      root: new THREE.Matrix4(),
      m: new THREE.Matrix4(),
      e: new THREE.Euler(),
      c: new THREE.Color(),
    }),
    [],
  );

  useEffect(() => {
    refs.current.forEach((im, i) => {
      if (!im) return;
      const slot = PART_SLOT[i];
      if (!slot || slot === "eye" || slot === "shoe" || slot === "lip" || slot === "tattoo") return;
      const colorSlot = slot === "nail" ? "skin" : slot;
      fallbackNpcs.forEach((n, k) => im.setColorAt(k, tmp.c.set(n[colorSlot])));
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
  }, [tmp, fallbackNpcs]);

  useFrame(() => {
    const { root, m, e } = tmp;
    const px = rt.player.x;
    const pz = rt.player.z;
    const now = Date.now();
    for (let k = 0; k < fallbackNpcs.length; k++) {
      const n = fallbackNpcs[k]!;
      const far = Math.abs(n.x - px) > 95 || Math.abs(n.z - pz) > 95;
      if (n.mode === "off" || far) {
        for (let i = 0; i < refs.current.length; i++) refs.current[i]?.setMatrixAt(k, HIDE);
        continue;
      }
      const swim = n.mode === "swim" || n.y < 0;
      const isBike = n.role === "bicyclist";
      const isRs = n.role === "roadsafety";
      pose(
        {
          phase: isRs ? rt.t * 2.5 : n.phase,
          t: rt.t + n.id * 0.37,
          female: n.gender === "female",
          hairStyle: n.hairStyle,
          amp: isRs ? 0.35 : Math.min(1.2, n.speed / 3.5),
          mode:
            n.mode === "dance"
              ? "dance"
              : n.mode === "sit" || isBike
                ? "sit"
                : swim
                  ? "swim"
                  : "walk",
          talking: now < n.talkUntil,
        },
        local,
      );
      root.makeRotationFromEuler(
        e.set(swim ? 1.35 : n.mode === "stagger" ? -0.5 : 0, n.heading, 0, "YXZ"),
      );
      root.setPosition(n.x, n.y + (isBike ? 0.3 : 0), n.z);
      for (let i = 0; i < refs.current.length; i++) {
        refs.current[i]?.setMatrixAt(k, m.multiplyMatrices(root, local[i]!));
      }
    }
    for (let i = 0; i < refs.current.length; i++) {
      const im = refs.current[i];
      if (im) im.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {glbActors.map(({ npc, tpl }) => (
        <GlbNpcInstance key={`glb-${npc.id}-${tpl.key}`} npc={npc} tpl={tpl} />
      ))}
      {bicycleRiders.map(({ npc, tpl }) => (
        <GlbBicycleProp key={`bike-${npc.id}`} npc={npc} tpl={tpl} />
      ))}
      {geos.map((g, i) => (
        <instancedMesh
          key={`${i}-${N}`}
          ref={(im) => {
            refs.current[i] = im;
          }}
          args={[g, mats[i], N]}
          frustumCulled={false}
          castShadow={false}
        />
      ))}
    </>
  );
}
