import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useGame, saveNow, type Gender } from "@/game/store";
import { START_MONEY } from "@/game/rules";
import { initAudio } from "@/game/audio";
import { Humanoid } from "./Humanoid";
import { Button } from "@/components/ui/button";
import { initialLook } from "@/game/catalog";
import { rt } from "@/game/runtime";

const LOOKS = { male: initialLook("male"), female: initialLook("female") };
export function CharacterCreate() {
  const [gender, setGender] = useState<Gender>("female");
  const [name, setName] = useState("");
  const start = () => {
    if (!name.trim()) return;
    initAudio();
    useGame.getState().patch({ profile: { name: name.trim().slice(0, 18), gender, look: LOOKS[gender] }, money: START_MONEY });
    Object.assign(rt.player, { x: 0, z: 2, heading: Math.PI });
    saveNow();
  };
  return (
    <div className="fixed inset-0 flex flex-col bg-scene">
      <div className="create-header px-6 pt-8 text-center">
        <p className="mb-2 font-display text-xs uppercase text-primary">Eat · Dance · Flirt · Live</p>
        <h1 className="create-title font-display font-extrabold text-foreground">Reformed City</h1>
      </div>
      <div className="relative min-h-0 flex-1">
        <Canvas camera={{ position: [0, 1.1, 5.8], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}>
          <hemisphereLight args={["#fff1dc", "#6b5236", 1.2]} />
          <directionalLight position={[3, 5, 4]} intensity={2} />
          <Environment resolution={32}><Lightformer intensity={2} position={[0, 5, 3]} scale={[10, 10, 1]} /></Environment>
          {(["male", "female"] as Gender[]).map((g, i) => (
            <group key={g} position={[i ? 0.85 : -0.85, gender === g ? 0 : -0.05, 0]} scale={gender === g ? 1.08 : 0.92} rotation-y={i ? -0.25 : 0.25} onClick={() => setGender(g)}>
              <Humanoid look={LOOKS[g]} female={g === "female"} getPose={() => ({ phase: 0, amp: 0, t: performance.now() / 1000, mode: gender === g ? "dance" : "walk" })} />
            </group>
          ))}
          <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[3, 40]} /><meshStandardMaterial color="#c9a46a" /></mesh>
        </Canvas>
      </div>
      <div className="create-form hud-panel mx-4 mb-6 space-y-3 p-4 sm:mx-auto sm:w-[420px]">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as Gender[]).map((g) => (
            <Button key={g} onClick={() => setGender(g)} variant={gender === g ? "default" : "game"} aria-pressed={gender === g}>{g === "male" ? "Male" : "Female"}</Button>
          ))}
        </div>
        <input value={name} aria-label="Your name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()} placeholder="Enter your name" maxLength={18}
          className="w-full rounded-md border border-border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" />
        <Button onClick={start} disabled={!name.trim()} className="h-12 w-full font-bold">Move into your apartment · ₦30,000</Button>
      </div>
    </div>
  );
}
