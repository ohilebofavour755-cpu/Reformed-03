import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useGame, saveNow, type Gender } from "@/game/store";
import { START_MONEY } from "@/game/rules";
import { initAudio } from "@/game/audio";
import { isMobileViewport } from "@/game/materials";
import {
  cloneGlbTemplate,
  createCharacterAnimator,
  getCachedGlbWithFallback,
  preloadAllCharacterGlbs,
  subscribeGlbRegistry,
  type GlbTemplate,
} from "@/game/glbRegistry";
import { Button } from "@/components/ui/button";
import { initialLook } from "@/game/catalog";
import { rt } from "@/game/runtime";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

const LOOKS = { male: initialLook("male"), female: initialLook("female") };

function PreviewGlb({ tpl, selected }: { tpl: GlbTemplate; selected: boolean }) {
  const innerRef = useRef<THREE.Group>(null);
  const { obj, animator } = useMemo(() => {
    const cloned = cloneGlbTemplate(tpl);
    return { obj: cloned, animator: createCharacterAnimator(cloned, tpl, selected ? 0 : 1.7) };
  }, [tpl, selected]);

  useEffect(() => {
    return () => {
      animator.dispose();
    };
  }, [animator]);

  useFrame((_, raw) => {
    animator.update(
      Math.min(raw, 0.067),
      0,
      performance.now() / 1000,
      0,
      selected ? "dance" : "idle",
      innerRef.current,
    );
  });

  return (
    <group ref={innerRef}>
      <primitive object={obj} />
    </group>
  );
}

function PreviewPacer({ mobile }: { mobile: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!mobile) return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 1000 / 30) {
        last = now;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mobile, invalidate]);
  return null;
}

export function CharacterCreate() {
  const [gender, setGender] = useState<Gender>("female");
  const [name, setName] = useState("");
  const [mobile] = useState(isMobileViewport);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    preloadAllCharacterGlbs();
    return subscribeGlbRegistry(() => setVersion((v) => v + 1));
  }, []);

  const start = () => {
    if (!name.trim()) return;
    initAudio();
    useGame.getState().patch({
      profile: { name: name.trim().slice(0, 18), gender, look: LOOKS[gender] },
      money: START_MONEY,
    });
    Object.assign(rt.player, { x: 0, z: 2, heading: Math.PI });
    saveNow();
  };

  void version;

  return (
    <div className="fixed inset-0 flex flex-col bg-scene">
      <div className="create-header px-6 pt-8 text-center">
        <p className="mb-2 font-display text-xs uppercase text-primary">
          Eat · Dance · Flirt · Live
        </p>
        <h1 className="create-title font-display font-extrabold text-foreground">Reformed City</h1>
      </div>
      <div className="relative min-h-0 flex-1">
        <Canvas
          frameloop={mobile ? "demand" : "always"}
          shadows={false}
          dpr={1}
          gl={{ powerPreference: "low-power", antialias: false }}
          camera={{ position: [0, 1.1, 5.8], fov: 40 }}
          onCreated={({ camera, gl }) => {
            gl.setPixelRatio(1);
            camera.lookAt(0, 0.95, 0);
          }}
        >
          <PreviewPacer mobile={mobile} />
          <hemisphereLight args={["#fff1dc", "#6b5236", 1.2]} />
          <directionalLight position={[3, 5, 4]} intensity={2} />
          <Environment resolution={32} frames={1}>
            <Lightformer intensity={2} position={[0, 5, 3]} scale={[10, 10, 1]} />
          </Environment>
          {(["male", "female"] as Gender[]).map((g, i) => {
            const tpl = getCachedGlbWithFallback(g === "male" ? "maleplayer" : "fplayer");
            return (
              <group
                key={g}
                position={[i ? 0.85 : -0.85, gender === g ? 0 : -0.05, 0]}
                scale={gender === g ? 1.08 : 0.92}
                rotation-y={i ? -0.25 : 0.25}
                onClick={() => setGender(g)}
              >
                {tpl && <PreviewGlb tpl={tpl} selected={gender === g} />}
              </group>
            );
          })}
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[3, 40]} />
            <meshStandardMaterial color="#c9a46a" />
          </mesh>
        </Canvas>
      </div>
      <div className="create-form hud-panel mx-4 mb-6 space-y-3 p-4 sm:mx-auto sm:w-[420px]">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as Gender[]).map((g) => (
            <Button
              key={g}
              onClick={() => setGender(g)}
              variant={gender === g ? "default" : "game"}
              aria-pressed={gender === g}
            >
              {g === "male" ? "Male" : "Female"}
            </Button>
          ))}
        </div>
        <input
          value={name}
          aria-label="Your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && start()}
          placeholder="Enter your name"
          maxLength={18}
          className="w-full rounded-md border border-border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <Button onClick={start} disabled={!name.trim()} className="h-12 w-full font-bold">
          Move into your apartment · ₦30,000
        </Button>
      </div>
    </div>
  );
}
