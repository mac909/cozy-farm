/** Size of one map tile in pixels. */
export const TILE_SIZE = 16;

/** Walking speed in pixels per second. */
export const WALK_SPEED = 72;

/**
 * A character's feet are this many pixels below its position (the middle of its 16×16 sprite).
 * The client's collision box is centred there, and the rules use it for the tile you stand on.
 */
export const FEET_OFFSET = 5;

/** How often a client reports its position to the server, in milliseconds. */
export const POSITION_SEND_MS = 100;

/** Port the game server listens on (in dev, and inside the container). */
export const SERVER_PORT = 2567;

/** Name of the Colyseus room that holds the one shared world. */
export const FARM_ROOM = "farm";

/** How long an emote bubble stays above a character's head, in milliseconds. */
export const EMOTE_SHOW_MS = 2000;
