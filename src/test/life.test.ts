import { describe, it, expect, vi, afterEach } from "vitest";
import { apartmentBlocked, moveSwept, nearStation } from "@/game/sim/apartment";
import { cityBlocked } from "@/game/world";
import { AUTOSAVE_MS, divorceState, crashResult, driveStep } from "@/game/sim/mobility";
import { speakSubtitle } from "@/game/voice";

describe("planned life-game rules", () => {
  it("autosaves every 10 seconds", () => expect(AUTOSAVE_MS).toBe(10_000));
  it("apartment spawn is inside and clear of walls and furniture", () => {
    expect(apartmentBlocked(0, 2)).toBe(false);
    expect(apartmentBlocked(-4.7, -3.6)).toBe(true);
    expect(nearStation(0, 5)).toBe("door");
  });
  it("cannot walk through any apartment wall, even in a large step", () => {
    for (const [dx, dz] of [[50, 0], [-50, 0], [0, 50], [0, -50]]) {
      const p = { x: 0, z: 2 };
      moveSwept(p, dx ?? 0, dz ?? 0, apartmentBlocked);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(6.6);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(5.6);
      expect(apartmentBlocked(p.x, p.z)).toBe(false);
    }
  });
  it("cannot run or drive through exterior walls", () => {
    const p = { x: 0, z: 12 };
    moveSwept(p, 0, -30, (x, z) => cityBlocked(x, z, 1.25));
    expect(p.z).toBeGreaterThanOrEqual(9.25);
    expect(cityBlocked(0, 0)).toBe(true);
  });
  it("divorce only ends marriage after confirmation", () => {
    const partner = { id: 5, name: "Maya" };
    expect(divorceState(false, partner)).toEqual(partner);
    expect(divorceState(true, partner)).toBeNull();
  });
  it("vehicle collisions produce smoke but never death", () => {
    expect(crashResult()).toEqual({ fatal: false, smoke: true, speedMultiplier: 0.15 });
  });
  it("vehicles accelerate and brake instead of moving instantly", () => {
    const v = { speed: 0, heading: 0 };
    const step = driveStep(v, 1, 0, 0.05, "car");
    expect(step.dz).toBeGreaterThan(0);
    expect(step.dx).toBe(0);
    expect(v.speed).toBeLessThan(22);
  });
  it("spoken NPC words exactly match the subtitle", () => {
    const spoken: string[] = [];
    class Utterance { constructor(public text: string) { spoken.push(text); } }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ name: "Google US English", lang: "en-US" }], speak: vi.fn() });
    const notify = vi.fn(), line = "Damn! Watch the paint!";
    speakSubtitle("Alex", line, "male", false, notify);
    expect(spoken).toEqual([line]);
    expect(notify).toHaveBeenCalledWith(`Alex: “${line}”`);
  });
});
afterEach(() => vi.unstubAllGlobals());