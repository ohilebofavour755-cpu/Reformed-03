import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rt } from "@/game/runtime";
import type { Npc } from "@/game/npcs";
import {
  cloneGlbTemplate,
  createCharacterAnimator,
  disposeClonedCharacter,
  ensureGlbLoaded,
  getCachedGlb,
  preloadCityNpcGlbs,
  subscribeGlbRegistry,
  type AnimIntent,
  type GlbRoleKey,
  type GlbTemplate,
} from "@/game/glbRegistry";

function glbKeyForNpc(n: Npc): GlbRoleKey {
  switch (n.role) {
    case "police":
      return "police";
    case "trampoline":
      return "trampoline";
    case "bicyclist":
      return "bicyclenpc";
    case "thug":
      return "beachmale";
    case "beach":
      return "beach";
    case "hookup":
    case "club":
      return "ch";
    default:
      return n.gender === "male" ? "mannpc" : "femalenpc";
  }
}

function npcIntent(n: Npc): AnimIntent {
  if (n.mode === "swim" || n.y < 0) return "swim";
  if (n.mode === "dance") return "dance";
  if (n.mode === "sit" || n.role === "bicyclist") return "sit";
  if (n.role === "trampoline") return "bounce";
  return n.speed > 4.6 ? "run" : n.speed > 0.15 ? "walk" : "idle";
}

function GlbNpcInstance({ npc, tpl }: { npc: Npc; tpl: GlbTemplate }) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  const { cloneRoot, animator } = useMemo(() => {
    const cloned = cloneGlbTemplate(tpl);
    const anim = createCharacterAnimator(cloned, tpl, npc.phase + npc.id * 0.37);
    return { cloneRoot: cloned, animator: anim };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl, npc.id]);

  useEffect(() => {
    return () => {
      disposeClonedCharacter(cloneRoot, tpl, animator);
    };
  }, [cloneRoot, tpl, animator]);

  useFrame((_, raw) => {
    const outer = outerRef.current;
    if (!outer) return;
    const far = Math.abs(npc.x - rt.player.x) > 85 || Math.abs(npc.z - rt.player.z) > 85;
    if (npc.mode === "off" || far) {
      outer.visible = false;
      return;
    }
    outer.visible = true;

    const dt = Math.min(raw, 0.067);
    const intent = npcIntent(npc);
    animator.update(dt, npc.phase, rt.t + npc.id * 0.37, npc.speed, intent, innerRef.current);

    outer.position.set(npc.x, npc.y, npc.z);
    outer.rotation.set(npc.mode === "stagger" ? -0.42 : 0, npc.heading, 0, "YXZ");
  });

  return (
    <group ref={outerRef}>
      <group ref={innerRef}>
        <primitive object={cloneRoot} />
      </group>
    </group>
  );
}

export function Crowd({ npcs }: { npcs?: Npc[] }) {
  const sourceNpcs = npcs ?? rt.npcs;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (npcs) {
      const needed = new Set<GlbRoleKey>();
      for (const n of npcs) needed.add(glbKeyForNpc(n));
      for (const k of needed) void ensureGlbLoaded(k, true);
    } else {
      preloadCityNpcGlbs();
    }
    return subscribeGlbRegistry(() => setVersion((v) => v + 1));
  }, [npcs]);

  const glbActors = useMemo(() => {
    void version;
    const actors: { npc: Npc; tpl: GlbTemplate }[] = [];
    for (const n of sourceNpcs) {
      const key = glbKeyForNpc(n);
      const tpl = getCachedGlb(key);
      if (tpl) actors.push({ npc: n, tpl });
    }
    return actors;
  }, [sourceNpcs, version]);

  return (
    <>
      {glbActors.map(({ npc, tpl }) => (
        <GlbNpcInstance key={`glb-${npc.id}-${tpl.key}`} npc={npc} tpl={tpl} />
      ))}
    </>
  );
}
