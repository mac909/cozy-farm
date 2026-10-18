import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../constants";
import { isWalkable, tileCenter } from "./map";
import {
  VILLAGE,
  areaOf,
  doorNear,
  doorTile,
  exitNear,
  exitTile,
  floorOrigin,
  floorSize,
  floorToMap,
  frontOfDoor,
  houseAt,
  keepClearTile,
  mapToFloor,
} from "./houses";
import { VILLAGE_MAP } from "./villageMap";

const map = VILLAGE_MAP;
const [one, two] = map.houses;

describe("the cottages", () => {
  it("are two, each with its room", () => {
    expect(map.houses.map((plan) => plan.id)).toEqual(["house1", "house2"]);
    for (const plan of map.houses) {
      expect(plan.building.width).toBe(4 * TILE_SIZE);
      expect(plan.interior.width).toBeGreaterThanOrEqual(5 * TILE_SIZE);
    }
  });

  it("have a door on the bottom row, blocked, with open ground in front of it", () => {
    for (const plan of map.houses) {
      const door = doorTile(plan);
      expect(map.blocked[door.row][door.col]).toBe(true);
      const front = frontOfDoor(plan);
      expect(isWalkable(map, front.col, front.row)).toBe(true);
    }
  });

  it("have a room with a floor you can walk on and a way out in the middle of the bottom wall", () => {
    for (const plan of map.houses) {
      const origin = floorOrigin(plan);
      const { width, height } = floorSize(plan);
      for (let row = 0; row < height; row++)
        for (let col = 0; col < width; col++) expect(isWalkable(map, origin.col + col, origin.row + row), `${plan.id} ${col},${row}`).toBe(true);
      const exit = exitTile(plan);
      expect(isWalkable(map, exit.col, exit.row)).toBe(true);
      // Walls all round, apart from the way out.
      expect(isWalkable(map, exit.col - 1, exit.row)).toBe(false);
      expect(isWalkable(map, exit.col + 1, exit.row)).toBe(false);
      expect(isWalkable(map, exit.col, exit.row + 1)).toBe(false);
      expect(isWalkable(map, origin.col - 1, origin.row)).toBe(false);
      expect(isWalkable(map, origin.col, origin.row - 1)).toBe(false);
    }
  });

  it("keeps the floor tile just inside the way out clear", () => {
    const clear = floorToMap(one, keepClearTile(one));
    const exit = exitTile(one);
    expect(clear).toEqual({ col: exit.col, row: exit.row - 1 });
    expect(mapToFloor(one, clear)).toEqual(keepClearTile(one));
  });
});

describe("where someone is", () => {
  it("is the village, or the room they're in", () => {
    expect(areaOf(map, tileCenter(map.spawn.col, map.spawn.row))).toBe(VILLAGE);
    const exit = exitTile(two);
    expect(areaOf(map, tileCenter(exit.col, exit.row))).toBe("house2");
    expect(houseAt(map, tileCenter(exit.col, exit.row - 2))?.id).toBe("house2");
  });

  it("finds the door you're standing at, and the way out you're on", () => {
    const front = frontOfDoor(one);
    const feet = { x: front.col * TILE_SIZE + 8, y: front.row * TILE_SIZE + 4 };
    expect(doorNear(map, feet, 1.5)?.id).toBe("house1");
    expect(doorNear(map, { x: feet.x + 5 * TILE_SIZE, y: feet.y + 3 * TILE_SIZE }, 1.5)).toBeNull();
    const exit = exitTile(one);
    expect(exitNear(map, { x: exit.col * TILE_SIZE + 8, y: exit.row * TILE_SIZE + 8 })?.id).toBe("house1");
    expect(exitNear(map, { x: exit.col * TILE_SIZE + 8, y: (exit.row - 3) * TILE_SIZE })).toBeNull();
  });
});
