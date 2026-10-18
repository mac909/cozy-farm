import { describe, expect, it } from "vitest";
import { clampMove, facingFor, stickToMove } from "./movement";

describe("clampMove", () => {
  it("keeps diagonal movement as fast as straight movement", () => {
    const move = clampMove(1, 1);
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1);
  });

  it("leaves slower input alone", () => {
    expect(clampMove(0.5, 0)).toEqual({ x: 0.5, y: 0 });
  });
});

describe("stickToMove", () => {
  it("ignores tiny drags", () => {
    expect(stickToMove(3, 0, 50)).toEqual({ x: 0, y: 0 });
    expect(stickToMove(0, 0, 50)).toEqual({ x: 0, y: 0 });
  });

  it("caps at full speed past the edge of the stick", () => {
    const move = stickToMove(200, 0, 50);
    expect(move.x).toBeCloseTo(1);
    expect(move.y).toBeCloseTo(0);
  });

  it("scales with how far the thumb is dragged", () => {
    expect(stickToMove(0, 25, 50).y).toBeCloseTo(0.5);
  });
});

describe("facingFor", () => {
  it("keeps the current facing when standing still", () => {
    expect(facingFor(0, 0, "left")).toBe("left");
  });

  it("faces along the stronger direction", () => {
    expect(facingFor(0.9, -0.2, "down")).toBe("right");
    expect(facingFor(0.1, -0.8, "down")).toBe("up");
  });
});
