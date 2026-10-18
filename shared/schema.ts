import { MapSchema, Schema, type } from "@colyseus/schema";

/** One person in the world. Positions are in world pixels. */
export class Player extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") facing = "down";
  /** The player's own clock (ms) when they reported this position. Others use the spacing between reports to keep the walk smooth. */
  @type("number") sentAt = 0;
  @type("string") name = "";
  /** A ShirtColorId. */
  @type("string") color = "";
}

/** Everything the server keeps in sync with every player. */
export class FarmState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
