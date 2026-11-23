import { describe, it, expect } from "vitest";
import { START_MONEY, remoteEarnings, arrest, JAIL_MS, RANKS } from "@/game/rules";

describe("Reformed City rules", () => {
  it("player starts with 30,000", () => expect(START_MONEY).toBe(30000));
  it("remote work pays 3,000 at the first rank", () => expect(remoteEarnings(0)).toBe(3000));
  it("earnings grow with rank", () => {
    expect(remoteEarnings(RANKS[2]!.xp)).toBeGreaterThan(remoteEarnings(RANKS[1]!.xp));
  });
  it("arrest with 20,000 or more is a 20,000 fine", () => {
    expect(arrest(25000, 0)).toEqual({ kind: "fine", money: 5000 });
  });
  it("arrest without 20,000 is 5 real minutes in jail", () => {
    expect(arrest(19999, 1000)).toEqual({ kind: "jail", until: 1000 + 5 * 60 * 1000 });
    expect(JAIL_MS).toBe(300000);
  });
});
