import type { BugId } from "../content/bugs";
import { CROPS, isCropId, type CropId } from "../content/crops";
import type { FishingSpot } from "../content/fish";
import { goesIn, type FurnitureId, type PlaceKind } from "../content/furniture";
import { FISHING_ROD, ITEMS, cropItemId, furnitureOf, goldenItemId, isItemId, seedItemId, type ItemId } from "../content/items";
import { PERK } from "../content/skills";
import { addItems, countOf, isSlotIndex, removeFromSlot, roomFor, type Inventory, type ItemStack } from "../inventory/inventory";
import { hasPerk } from "../progress/farmerProgress";
import type { RandomSource } from "../random/random";
import type { PlaceId } from "../world/places";
import { farmTileAt, farmerOf, setFarmTile, setFarmerBag, type FarmerId, type World } from "../world/world";
import { harvest, isRipe, plant, ripeStage, till, water, type FarmTile, type PlantedTile } from "./farming";

/**
 * The Action button: what it does for the tile in front of you and what you're holding, and the
 * hint it gives when it can't do anything. The client uses these to draw the button; the server
 * uses applyFarmAction to carry the action out. One set of rules, so they always agree.
 */

/** Which way you go in at a cottage's door: your own home, a visit, or moving into an empty one. */
export type DoorKind = "home" | "visit" | "moveIn";

/**
 * Something you're standing next to that takes over the Action button: a place on the map, a
 * cottage's door, the way out of a room, a bed, Marlow, the lighthouse's door once it's lit, or
 * something closed (the brambles, the dark lighthouse) whose hint the button gives instead.
 */
export type Spot =
  | { kind: "place"; place: PlaceId }
  | { kind: "door"; houseId: string; how: DoorKind }
  | { kind: "exit"; houseId: string }
  | { kind: "bed" }
  | { kind: "keeper" }
  | { kind: "climb" }
  | { kind: "closed"; reason: HintReason };

/**
 * Things to collect near you, found by the caller: the beach find, driftwood or branch on the tile
 * in front (or under your feet), a bug fluttering close by, and where a line would go in if you're
 * facing water. `give`: at the board, what the item you're holding would give to (and how many).
 */
export interface Nearby {
  find?: { itemId: ItemId; col: number; row: number } | null;
  bug?: { id: string; bugId: BugId } | null;
  fishing?: { spot: FishingSpot; col: number; row: number } | null;
  give?: { project: string; need: string; itemId: ItemId; count: number } | null;
}

/** What the Action button does. */
export type Action =
  | { kind: "sleep" }
  | { kind: "crate" }
  | { kind: "seeds" }
  | { kind: "shop" }
  | { kind: "board" }
  | { kind: "give"; project: string; need: string; itemId: ItemId; count: number }
  | { kind: "talk" }
  | { kind: "climb" }
  | { kind: "closed"; reason: HintReason }
  | { kind: "enter"; houseId: string; how: DoorKind }
  | { kind: "leave"; houseId: string }
  | { kind: "place"; itemId: FurnitureId }
  | { kind: "pickUp"; itemId: ItemId; col: number; row: number }
  | { kind: "catch"; bugId: BugId; id: string }
  | { kind: "fish"; spot: FishingSpot; col: number; row: number }
  | { kind: "harvest"; cropId: CropId }
  | { kind: "till" }
  | { kind: "plant"; cropId: CropId }
  | { kind: "water" }
  | { kind: "none" };

/** The four actions that change a farm tile, as sent to the server. */
export type FarmActionKind = "till" | "plant" | "water" | "harvest";

const PLACE_ACTION: Record<PlaceId, Action> = {
  tent: { kind: "sleep" },
  crate: { kind: "crate" },
  seedStand: { kind: "seeds" },
  store: { kind: "shop" },
  board: { kind: "board" },
};

/** The item that digs. */
export const HOE: ItemId = "hoe";
/** The item that waters. It never runs dry. */
export const WATERING_CAN: ItemId = "watering_can";

/** The crop a seed item plants, or null if it isn't seeds. */
export function seedCrop(itemId: ItemId | null): CropId | null {
  if (itemId === null || !isItemId(itemId)) return null;
  const item = ITEMS[itemId];
  return item.category === "seed" ? item.cropId : null;
}

/**
 * What the Action button does, checked in this order:
 * next to a place (tent, crate, seed stand, store, the board), a door, the way out, a bed, Marlow
 * or the lit lighthouse's door → that (at the board, holding something it wants → give it);
 * a beach find, driftwood or a branch in front (or underfoot) → pick it up, whatever you're holding;
 * a bug fluttering close by → catch it, whatever you're holding;
 * holding furniture where it can go (`placing`: your own house, or the farm) → put it down;
 * the fishing rod, facing water you can fish → cast;
 * a ripe crop in front → pick it, whatever you're holding;
 * the hoe on farmland grass → dig;
 * seeds on bare dug soil → plant;
 * the watering can on soil that isn't watered yet → water;
 * facing something closed (the brambles, the dark lighthouse) → its hint;
 * otherwise nothing.
 *
 * `tile` is the tile in front of you; `isFarmland` whether the map allows digging there; `held` the
 * item in your selected hotbar slot; `spot` what you're next to, if anything; `placing` what kind
 * of furniture can be put down where you are (null in someone else's house).
 */
export function chooseAction(
  tile: FarmTile,
  isFarmland: boolean,
  held: ItemId | null,
  spot: Spot | null,
  placing: PlaceKind | null = null,
  nearby: Nearby = {},
): Action {
  if (spot?.kind === "place" && spot.place === "board" && nearby.give) return { kind: "give", ...nearby.give };
  if (spot && spot.kind !== "closed") return spotAction(spot);
  const action = collectOrFarm(tile, isFarmland, held, placing, nearby);
  return action.kind === "none" && spot?.kind === "closed" ? { kind: "closed", reason: spot.reason } : action;
}

function collectOrFarm(tile: FarmTile, isFarmland: boolean, held: ItemId | null, placing: PlaceKind | null, nearby: Nearby): Action {
  if (nearby.find) return { kind: "pickUp", ...nearby.find };
  if (nearby.bug) return { kind: "catch", ...nearby.bug };
  const furniture = furnitureOf(held);
  if (furniture && placing && goesIn(furniture, placing)) return { kind: "place", itemId: furniture };
  if (held === FISHING_ROD && nearby.fishing) return { kind: "fish", ...nearby.fishing };
  if (tile.kind === "planted" && isRipe(tile)) return { kind: "harvest", cropId: tile.cropId };
  if (held === HOE && tile.kind === "untilled" && isFarmland) return { kind: "till" };
  const seed = seedCrop(held);
  if (seed && tile.kind === "tilled") return { kind: "plant", cropId: seed };
  if (held === WATERING_CAN && tile.kind !== "untilled" && !tile.watered) return { kind: "water" };
  return { kind: "none" };
}

/** What being next to a spot does. */
export function spotAction(spot: Spot): Action {
  switch (spot.kind) {
    case "place":
      return PLACE_ACTION[spot.place];
    case "door":
      return { kind: "enter", houseId: spot.houseId, how: spot.how };
    case "exit":
      return { kind: "leave", houseId: spot.houseId };
    case "bed":
      return { kind: "sleep" };
    case "keeper":
      return { kind: "talk" };
    case "climb":
      return { kind: "climb" };
    case "closed":
      return { kind: "closed", reason: spot.reason };
  }
}

const DOOR_WORD: Record<DoorKind, string> = { home: "Home", visit: "Visit", moveIn: "Move in" };

const ACTION_WORD: Record<Exclude<Action["kind"], "enter" | "give">, string | null> = {
  sleep: "Sleep",
  crate: "Crate",
  seeds: "Seeds",
  shop: "Shop",
  board: "Board",
  talk: "Talk",
  climb: "Climb",
  closed: null,
  leave: "Leave",
  place: "Place",
  pickUp: "Pick up",
  catch: "Catch",
  fish: "Fish",
  harvest: "Pick",
  till: "Dig",
  plant: "Plant",
  water: "Water",
  none: null,
};

/** The word on the Action button's tag, or null when it's faded. */
export function actionWord(action: Action): string | null {
  if (action.kind === "enter") return DOOR_WORD[action.how];
  if (action.kind === "give") return `Give ${action.count}`;
  return ACTION_WORD[action.kind];
}

/** Why an action can't happen. Each one has a line of text in HINT_TEXT. */
export type HintReason =
  | "not-farmland"
  | "farm-field-only"
  | "already-dug"
  | "dig-first"
  | "has-crop"
  | "already-watered"
  | "growing"
  | "bag-full"
  | "empty-hand"
  | "not-a-tool"
  | "too-far"
  | "gone"
  | "no-hoe"
  | "no-can"
  | "no-seeds"
  | "not-near-tent"
  | "not-near-crate"
  | "not-sellable"
  | "crate-bag-full"
  | "not-near-stand"
  | "not-enough-coins"
  | "not-for-sale"
  | "not-near-store"
  | "not-near-door"
  | "not-near-bed"
  | "house-taken"
  | "has-house"
  | "not-your-house"
  | "not-furniture"
  | "house-only"
  | "farm-only"
  | "cant-go-here"
  | "someone-there"
  | "coming-soon"
  | "no-water"
  | "nothing-biting"
  | "no-rod"
  | "flew-off"
  | "not-near-board"
  | "not-open"
  | "step-waiting"
  | "not-needed"
  | "need-done"
  | "no-coins"
  | "nothing-to-give"
  | "brambles"
  | "lighthouse-dark";

/** A hint, with the details some of them need. */
export interface Hint {
  reason: HintReason;
  /** For "growing": which crop, how many more watered days, and whether it's had water today. */
  cropId?: CropId;
  days?: number;
  watered?: boolean;
}

const HINT_TEXT: Record<Exclude<HintReason, "growing">, string> = {
  "not-farmland": "You can only dig in the farm field.",
  "farm-field-only": "That works in the farm field.",
  "already-dug": "Already dug. Plant some seeds!",
  "dig-first": "Dig it with the hoe first.",
  "has-crop": "Something's already growing here.",
  "already-watered": "Already watered today.",
  "bag-full": "Your bag is full.",
  "empty-hand": "Pick something from your hotbar.",
  "not-a-tool": "Hold the hoe, seeds or watering can to farm.",
  "too-far": "A little closer!",
  gone: "Someone got there first.",
  "no-hoe": "You need the hoe for that.",
  "no-can": "You need the watering can for that.",
  "no-seeds": "Pick some seeds from your hotbar.",
  "not-near-tent": "Walk up to the tent first.",
  "not-near-crate": "Walk up to the crate first.",
  "not-sellable": "Tools can't be sold.",
  "crate-bag-full": "Your bag is full, so some stayed in the crate.",
  "not-near-stand": "Walk up to the seed stand first.",
  "not-enough-coins": "Not enough coins for that.",
  "not-for-sale": "That isn't sold here.",
  "not-near-store": "Walk up to the store first.",
  "not-near-door": "Walk up to the door first.",
  "not-near-bed": "Walk up to a bed or the tent first.",
  "house-taken": "Someone already lives here.",
  "has-house": "You already have a house.",
  "not-your-house": "Only whoever lives here can arrange it.",
  "not-furniture": "Pick some furniture from your bag.",
  "house-only": "That goes inside your house.",
  "farm-only": "That goes outside, on the farm.",
  "cant-go-here": "It won't fit there.",
  "someone-there": "Someone's standing there.",
  "coming-soon": "Coming soon!",
  "no-water": "Face the water from the dock or the beach to fish.",
  "nothing-biting": "Nothing's biting here just now.",
  "no-rod": "You need the fishing rod for that.",
  "flew-off": "It fluttered off!",
  "not-near-board": "Walk up to the board first.",
  "not-open": "That isn't up on the board just now.",
  "step-waiting": "Marlow's seeing to that tonight.",
  "not-needed": "The board doesn't need that just now.",
  "need-done": "That's all in already!",
  "no-coins": "The wallet's empty.",
  "nothing-to-give": "Nothing in your bag the board needs just now.",
  brambles: "Brambles, right across the old path. Marlow has a plan for them on the board.",
  "lighthouse-dark": "The lighthouse is dark. Marlow has a plan for it on the board.",
};

/** True for a hint the client can show; use it on hints that arrive from the server. */
export function isHint(value: unknown): value is Hint {
  const reason = (value as { reason?: unknown } | null)?.reason;
  return typeof reason === "string" && (reason === "growing" || Object.hasOwn(HINT_TEXT, reason));
}

/** The words in the speech bubble for a hint. */
export function hintText(hint: Hint): string {
  if (hint.reason !== "growing") return HINT_TEXT[hint.reason];
  const name = isCropId(hint.cropId) ? CROPS[hint.cropId].name : "It";
  const days = Number.isFinite(hint.days) ? Math.max(1, Math.round(hint.days as number)) : 1;
  if (days === 1 && hint.watered) return `${name}: ripe tomorrow!`;
  return `${name}: about ${days} more watered day${days === 1 ? "" : "s"}.`;
}

/** Watered days a crop still needs before it's ripe: 0 when it's ripe. */
export function daysLeft(tile: PlantedTile): number {
  const crop = CROPS[tile.cropId];
  return Math.max(0, (ripeStage(crop) - tile.stage) * crop.daysPerStage - tile.daysInStage);
}

/**
 * Why the Action button does nothing here: the hint it shows when tapped while faded. Null when
 * it does do something (see chooseAction). Places are left out: when you're next to one, the
 * button is never faded. `placing` is as for chooseAction.
 */
export function hintFor(tile: FarmTile, isFarmland: boolean, held: ItemId | null, placing: PlaceKind | null = null): Hint | null {
  if (chooseAction(tile, isFarmland, held, null, placing).kind !== "none") return null;
  if (held === FISHING_ROD && tile.kind !== "planted") return { reason: "no-water" };
  const furniture = furnitureOf(held);
  if (furniture && !(tile.kind === "planted")) {
    if (!placing) return { reason: "not-your-house" };
    return { reason: goesIn(furniture, "house") ? "house-only" : "farm-only" };
  }
  const seed = seedCrop(held);
  if (tile.kind === "planted") {
    if (seed) return { reason: "has-crop" };
    if (held === WATERING_CAN && tile.watered) return { reason: "already-watered" };
    return { reason: "growing", cropId: tile.cropId, days: daysLeft(tile), watered: tile.watered };
  }
  if (held === null) return { reason: "empty-hand" };
  if (tile.kind === "tilled") {
    if (held === HOE) return { reason: "already-dug" };
    if (held === WATERING_CAN) return { reason: "already-watered" };
    return { reason: "not-a-tool" };
  }
  // Untilled ground.
  if (held === HOE) return { reason: "not-farmland" };
  if (seed || held === WATERING_CAN) return { reason: isFarmland ? "dig-first" : "farm-field-only" };
  return { reason: "not-a-tool" };
}

/**
 * A pick's extras from a farmer's farming perks, rolled in a fixed order so the same random numbers
 * always give the same: golden (Golden crops), one more (A little extra, or Bumper crop), a seed
 * back (Seed saver). No `random`, no extras.
 */
function pickExtras(
  progress: Parameters<typeof hasPerk>[0],
  cropId: CropId,
  random: RandomSource | undefined,
): { golden: boolean; more: boolean; seeds: ItemStack[] } {
  if (!random) return { golden: false, more: false, seeds: [] };
  const goldenRoll = random.next();
  const moreRoll = random.next();
  const seedRoll = random.next();
  const moreChance = hasPerk(progress, "bumperCrop") ? PERK.bumperCrop : hasPerk(progress, "littleExtra") ? PERK.littleExtra : 0;
  return {
    golden: hasPerk(progress, "goldenCrops") && goldenRoll < PERK.goldenCrops,
    more: moreRoll < moreChance,
    seeds: hasPerk(progress, "seedSaver") && seedRoll < PERK.seedSaver ? [{ itemId: seedItemId(cropId), count: 1 }] : [],
  };
}

/** A farmer asking to change a farm tile. The caller has already checked the tile is within reach. */
export interface FarmRequest {
  farmerId: FarmerId;
  action: FarmActionKind;
  col: number;
  row: number;
  /** For "plant": the bag slot holding the seeds. */
  slot?: number;
}

export type FarmActionResult =
  | {
      ok: true;
      world: World;
      tile: FarmTile;
      /** A pick: what it gave, and whether the plant had grown back after an earlier pick. */
      harvested?: ItemStack;
      regrown?: boolean;
      /** A pick's little extras from the farmer's perks (one more, a seed back). */
      bonus?: ItemStack[];
    }
  | { ok: false; hint: Hint };

const refuse = (reason: HintReason): FarmActionResult => ({ ok: false, hint: { reason } });

/**
 * Carries out a farm action for one farmer, joining the farming rules and the bag rules: digging
 * needs a hoe and farmland, planting takes one seed from the given slot, watering needs the can,
 * picking needs room in the bag. All or nothing: a refusal leaves the world as it was and says why.
 *
 * The farmer's farming perks (Milestone 7) come in here: planting waters the tile too, or gives it
 * a day's start; and with `random`, a pick may be golden, give one more, or give a seed back, each
 * only if the bag has room for it (a pick never fails for an extra).
 */
export function applyFarmAction(
  world: World,
  map: { farmland: readonly (readonly boolean[])[] },
  { farmerId, action, col, row, slot }: FarmRequest,
  random?: RandomSource,
): FarmActionResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  const tile = farmTileAt(world, col, row);
  const bag = farmer.bag;

  switch (action) {
    case "till": {
      if (countOf(bag, HOE) === 0) return refuse("no-hoe");
      if (tile.kind === "untilled" && !map.farmland[row]?.[col]) return refuse("not-farmland");
      const result = till(tile);
      if (!result.ok) return refuse(result.reason === "already-tilled" ? "already-dug" : "has-crop");
      return { ok: true, world: setFarmTile(world, col, row, result.tile), tile: result.tile };
    }
    case "plant": {
      if (!isSlotIndex(bag, slot)) return refuse("no-seeds");
      const cropId = seedCrop(bag[slot]?.itemId ?? null);
      if (!cropId) return refuse("no-seeds");
      const result = plant(tile, cropId, { water: hasPerk(farmer.progress, "plantAndWater"), headStart: hasPerk(farmer.progress, "earlyRiser") });
      if (!result.ok) return refuse(result.reason === "has-crop" ? "has-crop" : "dig-first");
      const taken = removeFromSlot(bag, slot, 1);
      if (!taken.ok) return refuse("no-seeds");
      const next = setFarmerBag(setFarmTile(world, col, row, result.tile), farmerId, taken.inventory);
      return { ok: true, world: next, tile: result.tile };
    }
    case "water": {
      if (countOf(bag, WATERING_CAN) === 0) return refuse("no-can");
      const result = water(tile);
      if (!result.ok) return refuse(result.reason === "already-watered" ? "already-watered" : "dig-first");
      return { ok: true, world: setFarmTile(world, col, row, result.tile), tile: result.tile };
    }
    case "harvest": {
      if (tile.kind !== "planted") return refuse("gone");
      if (!isRipe(tile)) return { ok: false, hint: { reason: "growing", cropId: tile.cropId, days: daysLeft(tile), watered: tile.watered } };
      const amount = CROPS[tile.cropId].harvestAmount;
      if (roomFor(bag, cropItemId(tile.cropId)) < amount) return refuse("bag-full");
      const result = harvest(tile);
      if (!result.ok) return refuse("gone");
      const extras = pickExtras(farmer.progress, tile.cropId, random);
      // A golden one instead, if there's room for it.
      const itemId = extras.golden && roomFor(bag, goldenItemId(tile.cropId)) >= amount ? goldenItemId(tile.cropId) : cropItemId(tile.cropId);
      const added = addItems(bag, itemId, amount);
      if (!added.ok || added.leftover > 0) return refuse("bag-full");
      let after: Inventory = added.inventory;
      const bonus: ItemStack[] = [];
      for (const extra of extras.more ? [{ itemId, count: 1 }, ...extras.seeds] : extras.seeds) {
        if (roomFor(after, extra.itemId) < extra.count) continue;
        const more = addItems(after, extra.itemId, extra.count);
        if (!more.ok) continue;
        after = more.inventory;
        bonus.push(extra);
      }
      const next = setFarmerBag(setFarmTile(world, col, row, result.tile), farmerId, after);
      return { ok: true, world: next, tile: result.tile, harvested: { itemId, count: amount }, regrown: tile.regrown === true, ...(bonus.length ? { bonus } : {}) };
    }
  }
}
