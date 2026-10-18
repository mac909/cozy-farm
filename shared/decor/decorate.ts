import { moveInFurniture } from "../content/houses";
import { furnitureOf } from "../content/items";
import type { DoorKind, Hint, HintReason } from "../farming/actions";
import { addItems, isSlotIndex, removeFromSlot, roomFor } from "../inventory/inventory";
import { farmTileAt, farmerOf, setFarmerBag, type FarmerId, type House, type HouseId, type World } from "../world/world";
import { placeRefusal, type Board, type PlacedPiece } from "./pieces";

/**
 * Moving into a cottage, and putting furniture and decorations down, turning them and putting
 * them away: in your own house, or on the shared farm. All or nothing: a refusal leaves the world
 * as it was and says why, as a hint over the player's head.
 */

export type DecorResult = { ok: true; world: World } | { ok: false; hint: Hint };

const refuse = (reason: HintReason): DecorResult => ({ ok: false, hint: { reason } });

/** Where a piece is going: someone's house (by id), or the farm. The board says which tiles are free. */
export type DecorTarget = { kind: "house"; houseId: HouseId; board: Board } | { kind: "farm"; board: Board };

export type { DoorKind };


/** Who lives where: the world's houses, or the network copy of them. */
type Owners = Readonly<Record<HouseId, { readonly owner: FarmerId }>>;

/** The cottage a farmer lives in, if any. */
export function homeOf(houses: Owners, farmerId: FarmerId): HouseId | null {
  return Object.entries(houses).find(([, house]) => house.owner === farmerId)?.[0] ?? null;
}

/**
 * What a cottage's door does for a farmer: their own home; someone else's (or an empty one, once
 * they have a home of their own) to visit; or an empty one to move into.
 */
export function doorKind(houses: Owners, houseId: HouseId, farmerId: FarmerId): DoorKind {
  const house = Object.hasOwn(houses, houseId) ? houses[houseId] : undefined;
  if (house) return house.owner === farmerId ? "home" : "visit";
  return homeOf(houses, farmerId) ? "visit" : "moveIn";
}

/** A farmer moves into an empty cottage, where a bed and a fern are waiting. One cottage each. */
export function moveIn(world: World, farmerId: FarmerId, houseId: HouseId): DecorResult {
  if (!farmerOf(world, farmerId)) return refuse("gone");
  if (Object.hasOwn(world.houses, houseId)) return refuse(world.houses[houseId].owner === farmerId ? "gone" : "house-taken");
  if (homeOf(world.houses, farmerId)) return refuse("has-house");
  const house: House = { owner: farmerId, furniture: moveInFurniture(houseId) };
  return { ok: true, world: { ...world, houses: { ...world.houses, [houseId]: house } } };
}

/** The pieces where a target is, and the world with them replaced. */
function piecesAt(world: World, target: DecorTarget): readonly PlacedPiece[] | null {
  if (target.kind === "farm") return world.decorations;
  return Object.hasOwn(world.houses, target.houseId) ? world.houses[target.houseId].furniture : null;
}

function withPieces(world: World, target: DecorTarget, pieces: readonly PlacedPiece[]): World {
  if (target.kind === "farm") return { ...world, decorations: pieces };
  const house = world.houses[target.houseId];
  return { ...world, houses: { ...world.houses, [target.houseId]: { ...house, furniture: pieces } } };
}

/** Why a farmer can't change things at a target: a house that isn't theirs (or nobody's). */
function notAllowed(world: World, farmerId: FarmerId, target: DecorTarget): HintReason | null {
  if (!farmerOf(world, farmerId)) return "gone";
  if (target.kind === "house" && world.houses[target.houseId]?.owner !== farmerId) return "not-your-house";
  return null;
}

/** Puts one piece of furniture from a bag slot down at a spot. */
export function placeFromBag(world: World, farmerId: FarmerId, target: DecorTarget, slot: number, at: Omit<PlacedPiece, "itemId">): DecorResult {
  const why = notAllowed(world, farmerId, target);
  if (why) return refuse(why);
  const pieces = piecesAt(world, target);
  const bag = farmerOf(world, farmerId)!.bag;
  if (!pieces || !isSlotIndex(bag, slot)) return refuse("gone");
  const itemId = furnitureOf(bag[slot]?.itemId);
  if (!itemId) return refuse("not-furniture");
  const piece: PlacedPiece = { itemId, col: at.col, row: at.row, turn: at.turn };
  const refusal = placeRefusal(target.board, pieces, piece);
  if (refusal) return refuse(refusal);
  const taken = removeFromSlot(bag, slot, 1);
  if (!taken.ok) return refuse("gone");
  return { ok: true, world: withPieces(setFarmerBag(world, farmerId, taken.inventory), target, [...pieces, piece]) };
}

/** Finds a piece by what it is and where its top-left tile is. */
function findPiece(pieces: readonly PlacedPiece[], at: Pick<PlacedPiece, "itemId" | "col" | "row">): number {
  return pieces.findIndex((p) => p.itemId === at.itemId && p.col === at.col && p.row === at.row);
}

/** Moves (or turns, or both) a piece that's already down. */
export function movePiece(
  world: World,
  farmerId: FarmerId,
  target: DecorTarget,
  from: Pick<PlacedPiece, "itemId" | "col" | "row">,
  to: Omit<PlacedPiece, "itemId">,
): DecorResult {
  const why = notAllowed(world, farmerId, target);
  if (why) return refuse(why);
  const pieces = piecesAt(world, target);
  const index = pieces ? findPiece(pieces, from) : -1;
  if (!pieces || index < 0) return refuse("gone");
  const piece: PlacedPiece = { itemId: pieces[index].itemId, col: to.col, row: to.row, turn: to.turn };
  const refusal = placeRefusal(target.board, pieces, piece, index);
  if (refusal) return refuse(refusal);
  return { ok: true, world: withPieces(world, target, pieces.map((p, i) => (i === index ? piece : p))) };
}

/** Picks a piece up into the farmer's bag. */
export function putAway(world: World, farmerId: FarmerId, target: DecorTarget, at: Pick<PlacedPiece, "itemId" | "col" | "row">): DecorResult {
  const why = notAllowed(world, farmerId, target);
  if (why) return refuse(why);
  const pieces = piecesAt(world, target);
  const index = pieces ? findPiece(pieces, at) : -1;
  if (!pieces || index < 0) return refuse("gone");
  const bag = farmerOf(world, farmerId)!.bag;
  if (roomFor(bag, pieces[index].itemId) < 1) return refuse("bag-full");
  const added = addItems(bag, pieces[index].itemId, 1);
  if (!added.ok) return refuse("bag-full");
  return { ok: true, world: withPieces(setFarmerBag(world, farmerId, added.inventory), target, pieces.filter((_, i) => i !== index)) };
}

/** Whether a farm tile has been dug: decorations stay off the field's soil. */
export function isDug(world: World, col: number, row: number): boolean {
  return farmTileAt(world, col, row).kind !== "untilled";
}

/** The dug-soil check for farmBoard, from a world. */
export const dugIn = (world: World) => (col: number, row: number) => isDug(world, col, row);
