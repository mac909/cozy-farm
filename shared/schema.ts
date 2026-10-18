import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

/**
 * The network copy of the world that Colyseus keeps in sync with every player. The server's
 * source of truth is the plain World (shared/world/world.ts); after each change the room copies
 * the changed parts in here (shared/stateSync.ts). Clients read it, never write it.
 */

/** The day clock, rounded down to the HUD's 10-minute step so it only syncs when the HUD changes. */
export class Clock extends Schema {
  @type("uint32") day = 1;
  /** Game minutes after midnight, a multiple of HUD_MINUTE_STEP. */
  @type("uint16") minute = 360;
}

/** One slot of a bag. */
export class BagSlot extends Schema {
  /** An ItemId, or "" for an empty slot (ArraySchema can't hold null well). */
  @type("string") itemId = "";
  @type("uint16") count = 0;
}

/** One dug farm tile. Tiles nobody has dug aren't in the farm at all. */
export class FarmPlot extends Schema {
  /** "tilled" (bare soil) or "planted". */
  @type("string") kind = "tilled";
  @type("boolean") watered = false;
  /** A CropId when planted, otherwise "". */
  @type("string") cropId = "";
  @type("uint8") stage = 0;
  /** Watered days in the current stage, for the "about 2 more days" hint. */
  @type("uint8") daysInStage = 0;
}

/** One line of the shipping crate: an item and how many (no stack limit in the crate). */
export class CrateEntry extends Schema {
  /** An ItemId. */
  @type("string") itemId = "";
  @type("uint32") count = 0;
}

/** A piece of furniture or a decoration put down: in a house, in floor tiles; on the farm, in map tiles. */
export class PieceState extends Schema {
  /** A FurnitureId. */
  @type("string") itemId = "";
  @type("uint16") col = 0;
  @type("uint16") row = 0;
  /** Which way round: an index into the piece's turns. */
  @type("uint8") turn = 0;
}

/** A cottage someone has moved into. */
export class HouseState extends Schema {
  /** The farmer who lives here. */
  @type("string") owner = "";
  /** Their name, for the sign over the door (they may not be online). */
  @type("string") ownerName = "";
  @type([PieceState]) furniture = new ArraySchema<PieceState>();
}

/** One person in the world. Positions are in world pixels. */
export class Player extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") facing = "down";
  /** The player's own clock (ms) when they reported this position. Others use the spacing between reports to keep the walk smooth. */
  @type("number") sentAt = 0;
  @type("string") name = "";
  /** A CharacterId. */
  @type("string") character = "";
  /** Which farmer this is: whose bag they carry. */
  @type("string") farmerId = "";
  /** In bed (the tent or a bed in a house), asleep: hidden from view until they get up or the morning comes. Never saved. */
  @type("boolean") inBed = false;
  /** The farmer's bag: INVENTORY_SLOTS slots, the first HOTBAR_SLOTS of them the hotbar. */
  @type([BagSlot]) bag = new ArraySchema<BagSlot>();
}

/** Everything the server keeps in sync with every player. */
export class FarmState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Clock) clock = new Clock();
  /** The shared wallet. */
  @type("uint32") coins = 0;
  /** The dug farm tiles, keyed "col,row". Dug soil never goes back to grass, so this only grows. */
  @type({ map: FarmPlot }) farm = new MapSchema<FarmPlot>();
  /** The shipping crate on the dock, shared, in the order things were first put in. It sells overnight. */
  @type([CrateEntry]) crate = new ArraySchema<CrateEntry>();
  /** The cottages someone has moved into, keyed by house id ("house1"). */
  @type({ map: HouseState }) houses = new MapSchema<HouseState>();
  /** Decorations on the farm. */
  @type([PieceState]) decorations = new ArraySchema<PieceState>();
}
