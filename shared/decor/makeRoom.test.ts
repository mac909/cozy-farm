import { describe, expect, it } from "vitest";
import { mapFor, NOTHING_BUILT } from "../world/gates";
import { todayFor } from "../world/today";
import { VILLAGE_MAP } from "../world/villageMap";
import { newWorld, type World } from "../world/world";
import { makeRoom, settleDecorations } from "./makeRoom";

describe("making room for something built", () => {
  const before = mapFor(VILLAGE_MAP, NOTHING_BUILT);
  const after = mapFor(VILLAGE_MAP, new Set(["keeper"]));
  const board = after.board!;
  const boardCol = board.x / 16;
  const boardRow = board.y / 16;

  it("moves a decoration standing where the Village Board goes to the nearest free spot, and loses nothing", () => {
    const world: World = {
      ...newWorld(),
      decorations: [
        { itemId: "barrel", col: boardCol, row: boardRow + 1, turn: 0 },
        { itemId: "fence", col: 20, row: 13, turn: 0 },
      ],
    };
    const moved = makeRoom(world, before, after);
    expect(moved.decorations).toHaveLength(2);
    const barrel = moved.decorations[0];
    expect(barrel.itemId).toBe("barrel");
    expect(barrel.col === boardCol && barrel.row === boardRow + 1).toBe(false);
    expect(Math.max(Math.abs(barrel.col - boardCol), Math.abs(barrel.row - boardRow - 1))).toBeLessThanOrEqual(3);
    // Anything not in the way stays put.
    expect(moved.decorations[1]).toEqual(world.decorations[1]);
  });

  it("leaves the world as it was when nothing's in the way", () => {
    const world: World = { ...newWorld(), decorations: [{ itemId: "fence", col: 20, row: 13, turn: 0 }] };
    expect(makeRoom(world, before, after)).toBe(world);
  });
});

describe("settling decorations when the server starts (Milestone 8)", () => {
  const map = mapFor(VILLAGE_MAP, NOTHING_BUILT);
  const shop = map.gardenShop!;
  const doorstep = { col: shop.x / 16 + 1, row: (shop.y + shop.height) / 16 };

  it("moves one left where the garden shop now stands (its doorstep, kept clear) to the nearest free spot", () => {
    const world: World = {
      ...newWorld(),
      decorations: [
        { itemId: "barrel", col: doorstep.col, row: doorstep.row, turn: 0 },
        { itemId: "fence", col: 20, row: 13, turn: 0 },
      ],
    };
    const settled = settleDecorations(world, map);
    expect(settled.decorations).toHaveLength(2);
    const barrel = settled.decorations[0];
    expect(barrel.col === doorstep.col && barrel.row === doorstep.row).toBe(false);
    expect(Math.max(Math.abs(barrel.col - doorstep.col), Math.abs(barrel.row - doorstep.row))).toBeLessThanOrEqual(3);
    expect(settled.decorations[1]).toEqual(world.decorations[1]);
  });

  it("leaves everything that fits alone, and pieces only in each other's way", () => {
    const fine: World = { ...newWorld(), decorations: [{ itemId: "fence", col: 20, row: 13, turn: 0 }] };
    expect(settleDecorations(fine, map)).toBe(fine);
    const stacked: World = {
      ...newWorld(),
      decorations: [
        { itemId: "barrel", col: 20, row: 13, turn: 0 },
        { itemId: "barrel", col: 20, row: 13, turn: 0 },
      ],
    };
    expect(settleDecorations(stacked, map)).toBe(stacked);
  });
});

describe("the village as of today", () => {
  it("never lets anything wash up on the point before its path is cleared", () => {
    const point = (tiles: readonly { col: number; row: number }[]) => tiles.filter((t) => t.col >= 57 && t.col <= 64 && t.row >= 23);
    const closed = todayFor(VILLAGE_MAP, new Set(["keeper"]));
    expect(point(closed.shore.sand)).toEqual([]);
    const open = todayFor(VILLAGE_MAP, new Set(["keeper", "lighthouse/path"]));
    expect(point(open.shore.sand).length).toBeGreaterThan(0);
    // Branches fall under the trees, where you can get to them.
    expect(open.grounds.woods.length).toBeGreaterThan(20);
    for (const tile of open.grounds.woods) expect(open.reachable.has(`${tile.col},${tile.row}`)).toBe(true);
  });

  it("works each set of built things out once", () => {
    expect(todayFor(VILLAGE_MAP, new Set(["keeper"]))).toBe(todayFor(VILLAGE_MAP, new Set(["keeper"])));
  });
});
