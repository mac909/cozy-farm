import { describe, expect, it } from "vitest";
import { POSITION_SEND_MS } from "./constants";
import { PositionBuffer, TELEPORT_DISTANCE } from "./interpolation";

/** Reports sent on the sender's clock every 100 ms, arriving `delays[i]` ms later on ours. */
function walkRight(buffer: PositionBuffer, delays: number[], senderStart = 5000, ourStart = 1000) {
  delays.forEach((delay, i) => {
    const sentAt = senderStart + i * 100;
    buffer.push(ourStart + i * 100 + delay, sentAt, i * 10, 0, "right");
  });
}

describe("PositionBuffer", () => {
  it("knows nothing before the first report", () => {
    expect(new PositionBuffer().sample(0)).toBeNull();
  });

  it("glides between reported positions", () => {
    const buffer = new PositionBuffer();
    walkRight(buffer, [0, 0]);
    expect(buffer.sample(1050)).toEqual({ x: 5, y: 0, facing: "right" });
    expect(buffer.sample(1100)).toEqual({ x: 10, y: 0, facing: "right" });
  });

  it("keeps a steady pace when reports arrive in clumps", () => {
    const buffer = new PositionBuffer();
    // Sent evenly, but delivered 0, 60, 10, 70, 0 ms late.
    walkRight(buffer, [0, 60, 10, 70, 0]);
    // Timed by when they were sent, so halfway between any two reports is halfway in distance.
    expect(buffer.sample(1150)!.x).toBeCloseTo(15, 0);
    expect(buffer.sample(1250)!.x).toBeCloseTo(25, 0);
    expect(buffer.sample(1350)!.x).toBeCloseTo(35, 0);
  });

  it("waits at the last known position when reports run out", () => {
    const buffer = new PositionBuffer();
    walkRight(buffer, [0, 0]);
    expect(buffer.sample(9000)).toEqual({ x: 10, y: 0, facing: "right" });
  });

  it("stays put until the first report is due", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 5000, 3, 7, "up");
    expect(buffer.sample(800)).toEqual({ x: 3, y: 7, facing: "up" });
  });

  it("turns when the corner is reached, not before", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 5000, 0, 0, "right");
    buffer.push(1100, 5100, 10, 0, "right");
    buffer.push(1200, 5200, 10, 10, "down");
    expect(buffer.sample(1050)!.facing).toBe("right");
    expect(buffer.sample(1099)!.facing).toBe("right");
    expect(buffer.sample(1101)!.facing).toBe("down");
  });

  it("jumps straight to a teleport instead of sliding across the map", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 5000, 0, 0, "down");
    buffer.push(1100, 5100, TELEPORT_DISTANCE + 50, 0, "down");
    expect(buffer.sample(1050)).toEqual({ x: TELEPORT_DISTANCE + 50, y: 0, facing: "down" });
  });

  it("after standing still, sets off at walking pace rather than drifting across the pause", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 5000, 0, 0, "right");
    buffer.push(9000, 13000, 8, 0, "right"); // stood still for 8 seconds, then took a step
    expect(buffer.sample(9000 - POSITION_SEND_MS)!.x).toBe(0);
    expect(buffer.sample(9000 - POSITION_SEND_MS / 2)!.x).toBe(4);
  });

  it("carries on from where they were when the sender's clock restarts (they reloaded)", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 50_000, 20, 0, "down");
    buffer.push(5000, 10, 28, 0, "right");
    expect(buffer.sample(5000 - POSITION_SEND_MS)!.x).toBe(20);
    expect(buffer.sample(5000)!.x).toBe(28);
  });

  it("ignores the same report seen twice", () => {
    const buffer = new PositionBuffer();
    buffer.push(1000, 5000, 0, 0, "right");
    buffer.push(1100, 5100, 10, 0, "right");
    buffer.push(1180, 5100, 10, 0, "right"); // a name change re-announced the same position
    expect(buffer.sample(1050)!.x).toBeCloseTo(5);
  });

  it("keeps going smoothly as old reports are dropped", () => {
    const buffer = new PositionBuffer();
    walkRight(buffer, new Array(50).fill(0));
    expect(buffer.sample(1000 + 4850)!.x).toBeCloseTo(485);
  });
});
