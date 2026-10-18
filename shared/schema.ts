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
  /** The day spring first came (Milestone 8), 0 before the seasons begin: the season follows from it and the day. */
  @type("uint32") yearStart = 0;
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

/** Something lying on the beach, on one sand tile. */
export class BeachFindState extends Schema {
  /** A BeachFindId: also the item it gives. */
  @type("string") findId = "";
  @type("uint16") col = 0;
  @type("uint16") row = 0;
}

/** A bug fluttering about one meadow tile. Keyed by its id in FarmState.bugs. */
export class BugState extends Schema {
  /** A BugId. */
  @type("string") bugId = "";
  /** The tile it flutters round; each screen draws the flutter itself. */
  @type("uint16") col = 0;
  @type("uint16") row = 0;
}

/** One thing found in the collection book. Keyed "section:id" ("fish:sardine") in FarmState.book. */
export class BookEntryState extends Schema {
  /** "fish", "finds" or "bugs". */
  @type("string") section = "";
  @type("string") id = "";
  /** How many have been caught or found. */
  @type("uint32") count = 0;
  @type("uint32") firstDay = 0;
  @type("string") firstBy = "";
  /** Fish only: the biggest so far, in centimetres, and who caught it. 0 and "" otherwise. */
  @type("uint16") biggestCm = 0;
  @type("string") biggestBy = "";
}

/** Someone who has given to a project: their face goes on its card (never how much they gave). */
export class HelperState extends Schema {
  @type("string") farmerId = "";
  @type("string") name = "";
  /** A CharacterId, for their face. */
  @type("string") character = "";
}

/** How far one project has got. Keyed by project id in VillageState.projects. */
export class ProjectState extends Schema {
  /** Steps whose needs are all in. */
  @type("uint8") gathered = 0;
  /** Steps built. */
  @type("uint8") built = 0;
  /** What's in for the step being gathered, by need key ("driftwood", "any:fish", "coins"). */
  @type({ map: "uint32" }) given = new MapSchema<number>();
  /** Everyone who has helped, in the order they first did. */
  @type([HelperState]) helpers = new ArraySchema<HelperState>();
  /** The day it was finished; 0 until then. */
  @type("uint32") doneDay = 0;
}

/** Marlow and the village's projects. */
export class VillageState extends Schema {
  /** The day Marlow arrived; 0 before he has. */
  @type("uint32") keeperDay = 0;
  @type({ map: ProjectState }) projects = new MapSchema<ProjectState>();
}

/** Driftwood or a branch lying on one tile. */
export class ForageState extends Schema {
  /** A ForageId: also the item it gives. */
  @type("string") itemId = "";
  @type("uint16") col = 0;
  @type("uint16") row = 0;
}

/**
 * A farmer's skills and badges (Milestone 7), copied from the farmer so their own You card is live.
 * Every screen gets everyone's, but each only ever shows its own: skills are never compared.
 */
export class ProgressState extends Schema {
  /** Total experience, by skill id. */
  @type({ map: "uint32" }) xp = new MapSchema<number>();
  /** Experience earned today, by skill id ("+36 today"). */
  @type({ map: "uint32" }) today = new MapSchema<number>();
  /** The counts badges go by, by count id. */
  @type({ map: "uint32" }) stats = new MapSchema<number>();
  /** The kinds of thing found ("every crop"), item ids. */
  @type(["string"]) kinds = new ArraySchema<string>();
  /** Badges earned, by badge id: the day each was. */
  @type({ map: "uint32" }) badges = new MapSchema<number>();
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
  /** Fishing: the tile their bobber floats on, "col,row", so everyone sees the line; "" when not. Never saved. */
  @type("string") fishing = "";
  /** The farmer's bag: INVENTORY_SLOTS slots, the first HOTBAR_SLOTS of them the hotbar. */
  @type([BagSlot]) bag = new ArraySchema<BagSlot>();
  /** The farmer's skills and badges (Milestone 7). */
  @type(ProgressState) progress = new ProgressState();
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
  /** What's lying on the beach, in the order it washed up. */
  @type([BeachFindState]) beach = new ArraySchema<BeachFindState>();
  /** The bugs out in the meadow now, by id. Not saved: they come and go with the clock. */
  @type({ map: BugState }) bugs = new MapSchema<BugState>();
  /** The shared collection book: everything found so far, keyed "section:id". */
  @type({ map: BookEntryState }) book = new MapSchema<BookEntryState>();
  /** Marlow and the village's projects. */
  @type(VillageState) village = new VillageState();
  /** Driftwood and branches lying about, in the order they turned up. */
  @type([ForageState]) forage = new ArraySchema<ForageState>();
}
