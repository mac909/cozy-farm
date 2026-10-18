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
  /** The farmer's bag: INVENTORY_SLOTS slots, the first HOTBAR_SLOTS of them the hotbar. */
  @type([BagSlot]) bag = new ArraySchema<BagSlot>();
}

/** Everything the server keeps in sync with every player. */
export class FarmState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Clock) clock = new Clock();
  /** The shared wallet. */
  @type("uint32") coins = 0;
}
