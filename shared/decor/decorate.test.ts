import { describe, expect, it } from "vitest";
import { INVENTORY_SLOTS, countOf, type Inventory } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmTile, setFarmerBag, type World } from "../world/world";
import { VILLAGE_MAP } from "../world/villageMap";
import { farmBoard, farmKeepClear, houseBoard } from "./boards";
import { doorKind, dugIn, homeOf, moveIn, movePiece, placeFromBag, putAway, type DecorTarget } from "./decorate";
import { pieceAt, placeRefusal, type Board, type PlacedPiece } from "./pieces";

const pip = { name: "Pip", character: "woman" as const };
const juno = { name: "Juno", character: "boy" as const };

/** Pip and Juno, Pip's bag holding what's given (padded with empty slots). */
function world(slots: Inventory = []): World {
  const both = addFarmer(addFarmer(newWorld(), "pip", pip), "juno", juno);
  return setFarmerBag(both, "pip", [...slots, ...Array(INVENTORY_SLOTS - slots.length).fill(null)]);
}

/** A plain 9 × 6 floor, with nobody standing anywhere. */
const floor: Board = { kind: "house", open: (col, row) => col >= 0 && row >= 0 && col < 9 && row < 6 };
const pipsHouse: DecorTarget = { kind: "house", houseId: "house1", board: floor };

/** Pip living in house1 with just what moving in gives. */
function pipAtHome(slots: Inventory = []): World {
  const moved = moveIn(world(slots), "pip", "house1");
  if (!moved.ok) throw new Error("couldn't move in");
  return moved.world;
}

const piece = (itemId: PlacedPiece["itemId"], col: number, row: number, turn = 0): PlacedPiece => ({ itemId, col, row, turn });

describe("moving in", () => {
  it("gives a farmer an empty cottage with a bed and a fern waiting", () => {
    const home = pipAtHome();
    expect(home.houses.house1.owner).toBe("pip");
    expect(home.houses.house1.furniture.map((p) => p.itemId)).toEqual(["red_bed", "potted_fern"]);
    expect(homeOf(home.houses, "pip")).toBe("house1");
    expect(homeOf(home.houses, "juno")).toBeNull();
  });

  it("is one cottage each, and nobody moves into someone else's", () => {
    const home = pipAtHome();
    expect(moveIn(home, "pip", "house2")).toEqual({ ok: false, hint: { reason: "has-house" } });
    expect(moveIn(home, "juno", "house1")).toEqual({ ok: false, hint: { reason: "house-taken" } });
    expect(moveIn(home, "juno", "house2").ok).toBe(true);
    expect(moveIn(home, "nobody", "house2").ok).toBe(false);
  });

  it("says what each door does for whom", () => {
    const home = pipAtHome();
    expect(doorKind(home.houses, "house1", "pip")).toBe("home");
    expect(doorKind(home.houses, "house1", "juno")).toBe("visit");
    expect(doorKind(home.houses, "house2", "juno")).toBe("moveIn");
    // Pip already has a home, so an empty cottage is just a look round.
    expect(doorKind(home.houses, "house2", "pip")).toBe("visit");
  });
});

describe("putting furniture down", () => {
  it("takes one from the bag and puts it where asked", () => {
    const home = pipAtHome([{ itemId: "sofa", count: 2 }]);
    const result = placeFromBag(home, "pip", pipsHouse, 0, { col: 4, row: 2, turn: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.houses.house1.furniture.at(-1)).toEqual(piece("sofa", 4, 2));
    expect(result.world.farmers.pip.bag[0]).toEqual({ itemId: "sofa", count: 1 });
  });

  it("only lets the owner arrange a house", () => {
    const home = setFarmerBag(pipAtHome(), "juno", [{ itemId: "sofa", count: 1 }, ...Array(INVENTORY_SLOTS - 1).fill(null)]);
    expect(placeFromBag(home, "juno", pipsHouse, 0, { col: 4, row: 2, turn: 0 })).toEqual({ ok: false, hint: { reason: "not-your-house" } });
    expect(putAway(home, "juno", pipsHouse, piece("red_bed", 0, 0))).toEqual({ ok: false, hint: { reason: "not-your-house" } });
  });

  it("won't put a piece on top of another, off the floor, or the wrong side of the door", () => {
    const home = pipAtHome([{ itemId: "sofa", count: 1 }, { itemId: "fence", count: 1 }, { itemId: "radish", count: 1 }]);
    // The bed is at 0,0–0,1.
    expect(placeFromBag(home, "pip", pipsHouse, 0, { col: 0, row: 1, turn: 0 })).toEqual({ ok: false, hint: { reason: "cant-go-here" } });
    expect(placeFromBag(home, "pip", pipsHouse, 0, { col: 8, row: 2, turn: 0 })).toEqual({ ok: false, hint: { reason: "cant-go-here" } });
    expect(placeFromBag(home, "pip", pipsHouse, 1, { col: 4, row: 2, turn: 0 })).toEqual({ ok: false, hint: { reason: "farm-only" } });
    expect(placeFromBag(home, "pip", pipsHouse, 2, { col: 4, row: 2, turn: 0 })).toEqual({ ok: false, hint: { reason: "not-furniture" } });
  });

  it("lets a rug go under furniture and furniture onto a rug, but not two rugs together", () => {
    const home = pipAtHome([{ itemId: "straw_rug", count: 2 }, { itemId: "wooden_chair", count: 1 }]);
    const rug = placeFromBag(home, "pip", pipsHouse, 0, { col: 0, row: 2, turn: 0 });
    if (!rug.ok) throw new Error("no rug");
    expect(placeFromBag(rug.world, "pip", pipsHouse, 1, { col: 1, row: 3, turn: 0 }).ok).toBe(true);
    expect(placeFromBag(rug.world, "pip", pipsHouse, 0, { col: 2, row: 3, turn: 0 })).toEqual({ ok: false, hint: { reason: "cant-go-here" } });
    // A rug slides under the bed and the fern too, if it's clear of the other rug.
    expect(placeFromBag(home, "pip", pipsHouse, 0, { col: 0, row: 0, turn: 0 }).ok).toBe(true);
  });

  it("doesn't put furniture on someone standing there, though a rug is fine", () => {
    const busy: Board = { ...floor, occupied: (col, row) => col === 4 && row === 3 };
    expect(placeRefusal(busy, [], piece("sofa", 3, 3))).toBe("someone-there");
    expect(placeRefusal(busy, [], piece("straw_rug", 3, 1))).toBeNull();
  });
});

describe("moving, turning and putting away", () => {
  it("moves a piece, which doesn't get in its own way", () => {
    const home = pipAtHome();
    const moved = movePiece(home, "pip", pipsHouse, piece("red_bed", 0, 0), { col: 0, row: 1, turn: 0 });
    expect(moved.ok && moved.world.houses.house1.furniture[0]).toEqual(piece("red_bed", 0, 1));
  });

  it("turns a bed on its side", () => {
    const home = pipAtHome();
    const turned = movePiece(home, "pip", pipsHouse, piece("red_bed", 0, 0), { col: 2, row: 3, turn: 1 });
    expect(turned.ok && turned.world.houses.house1.furniture[0]).toEqual(piece("red_bed", 2, 3, 1));
    // On its side it's 2 wide, so it doesn't fit against the right wall.
    expect(movePiece(home, "pip", pipsHouse, piece("red_bed", 0, 0), { col: 8, row: 3, turn: 1 }).ok).toBe(false);
  });

  it("puts a piece away into the bag", () => {
    const home = pipAtHome();
    const result = putAway(home, "pip", pipsHouse, piece("potted_fern", 1, 0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.houses.house1.furniture.map((p) => p.itemId)).toEqual(["red_bed"]);
    expect(countOf(result.world.farmers.pip.bag, "potted_fern")).toBe(1);
  });

  it("says so when the bag is full, and changes nothing", () => {
    const full: Inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ itemId: "hoe" as const, count: 1 }));
    const home = pipAtHome(full);
    expect(putAway(home, "pip", pipsHouse, piece("potted_fern", 1, 0))).toEqual({ ok: false, hint: { reason: "bag-full" } });
  });

  it("finds what's under a tile, furniture before a rug", () => {
    const pieces = [piece("straw_rug", 0, 0), piece("wooden_chair", 1, 1)];
    expect(pieceAt(pieces, 1, 1)).toBe(1);
    expect(pieceAt(pieces, 2, 2)).toBe(0);
    expect(pieceAt(pieces, 5, 5)).toBeNull();
  });
});

describe("the boards", () => {
  const plan = VILLAGE_MAP.houses[0];

  it("keeps the floor tile just inside the way out clear", () => {
    const board = houseBoard(plan);
    expect(board.open(0, 0)).toBe(true);
    expect(board.open(4, 5)).toBe(false);
    expect(board.open(3, 5)).toBe(true);
    expect(board.open(9, 0)).toBe(false);
    expect(board.open(-1, 0)).toBe(false);
  });

  it("keeps decorations off the field, the soil, paths to doors and stands, and out of the rooms", () => {
    const farm = setFarmTile(world(), 30, 10, { kind: "tilled", watered: false });
    const board = farmBoard(VILLAGE_MAP, dugIn(farm));
    // Open meadow.
    expect(board.open(25, 8)).toBe(true);
    // The farm field.
    expect(board.open(8, 6)).toBe(false);
    // Dug soil (only possible on the field, but the rule doesn't mind).
    expect(board.open(30, 10)).toBe(false);
    // In front of the store's door, and under the store.
    expect(board.open(27, 15)).toBe(false);
    expect(board.open(27, 12)).toBe(false);
    // The spawn point, and the sea.
    expect(board.open(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row)).toBe(false);
    expect(board.open(5, 30)).toBe(false);
    // A room's floor.
    expect(board.open(5, 40)).toBe(false);
    expect(farmKeepClear(VILLAGE_MAP).size).toBeGreaterThan(10);
  });

  it("puts decorations on the farm for anyone, and takes them back", () => {
    const farmTarget: DecorTarget = { kind: "farm", board: farmBoard(VILLAGE_MAP, dugIn(world())) };
    const start = setFarmerBag(world(), "juno", [{ itemId: "fence", count: 3 }, ...Array(INVENTORY_SLOTS - 1).fill(null)]);
    const placed = placeFromBag(start, "juno", farmTarget, 0, { col: 25, row: 8, turn: 2 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.world.decorations).toEqual([piece("fence", 25, 8, 2)]);
    // Pip can pick up Juno's fence.
    const taken = putAway(placed.world, "pip", farmTarget, piece("fence", 25, 8));
    expect(taken.ok && taken.world.decorations).toEqual([]);
    expect(taken.ok && countOf(taken.world.farmers.pip.bag, "fence")).toBe(1);
    // A sofa doesn't go outside.
    const sofa = setFarmerBag(start, "pip", [{ itemId: "sofa", count: 1 }, ...Array(INVENTORY_SLOTS - 1).fill(null)]);
    expect(placeFromBag(sofa, "pip", farmTarget, 0, { col: 25, row: 8, turn: 0 })).toEqual({ ok: false, hint: { reason: "house-only" } });
  });
});
