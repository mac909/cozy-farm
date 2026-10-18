import { describe, expect, it } from "vitest";
import { FURNITURE, FURNITURE_IDS, blocksWalking, footprintOf, goesIn, isFurnitureId, nextTurn } from "./furniture";
import { ITEMS, furnitureOf } from "./items";

describe("furniture data", () => {
  for (const id of FURNITURE_IDS) {
    it(`${id} has sensible numbers`, () => {
      const piece = FURNITURE[id];
      expect(piece.id).toBe(id);
      expect(piece.name).not.toBe("");
      expect(Number.isInteger(piece.price) && piece.price >= 2).toBe(true);
      expect(piece.where.length).toBeGreaterThan(0);
      expect(piece.turns.length).toBeGreaterThanOrEqual(1);
      expect(piece.turns.length).toBeLessThanOrEqual(8);
      for (const { width, height } of piece.turns) {
        expect(Number.isInteger(width) && width >= 1 && width <= 4).toBe(true);
        expect(Number.isInteger(height) && height >= 1 && height <= 4).toBe(true);
      }
      // Flat (rugs) and walkable (flowers) are different things; a piece is one or the other.
      expect(piece.flat && piece.walkable).toBeFalsy();
      if (piece.bed) expect(piece.where).toEqual(["house"]);
    });
  }

  it("is an item each, sold at the store and shipped back for half", () => {
    for (const id of FURNITURE_IDS) {
      const item = ITEMS[id];
      expect(item.category).toBe("furniture");
      expect(item.buyPrice).toBe(FURNITURE[id].price);
      expect(item.sellPrice).toBe(Math.floor(FURNITURE[id].price / 2));
      expect(furnitureOf(id)).toBe(id);
    }
    expect(furnitureOf("radish")).toBeNull();
    expect(furnitureOf(null)).toBeNull();
    expect(furnitureOf("toString")).toBeNull();
  });

  it("has beds, rugs, and things for the house and the farm", () => {
    expect(FURNITURE_IDS.filter((id) => FURNITURE[id].bed).length).toBeGreaterThanOrEqual(2);
    expect(FURNITURE_IDS.some((id) => FURNITURE[id].flat && goesIn(id, "house"))).toBe(true);
    expect(FURNITURE_IDS.filter((id) => goesIn(id, "farm")).length).toBeGreaterThan(5);
  });
});

describe("turning", () => {
  it("swaps a bed's footprint when it lies on its side", () => {
    expect(footprintOf("red_bed", 0)).toEqual({ width: 1, height: 2 });
    expect(footprintOf("red_bed", 1)).toEqual({ width: 2, height: 1 });
    expect(nextTurn("red_bed", 2)).toBe(0);
  });

  it("keeps a piece that only faces one way as it is", () => {
    expect(nextTurn("sofa", 0)).toBe(0);
    expect(footprintOf("sofa", 5)).toEqual({ width: 2, height: 1 });
  });
});

describe("walking", () => {
  it("is blocked by furniture but not by rugs or flowers", () => {
    expect(blocksWalking("sofa")).toBe(true);
    expect(blocksWalking("straw_rug")).toBe(false);
    expect(blocksWalking("sunflower")).toBe(false);
    expect(blocksWalking("fence")).toBe(true);
  });
});

describe("isFurnitureId", () => {
  it("knows its own ids and nothing else", () => {
    expect(isFurnitureId("sofa")).toBe(true);
    expect(isFurnitureId("radish")).toBe(false);
    expect(isFurnitureId("constructor")).toBe(false);
  });
});
