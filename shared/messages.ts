// Every message between client and server. Each feature has its own section, so features built side by side only meet in small additions.

import type { CharacterId } from "./content/characters";
import type { EmoteId } from "./content/emotes";
import type { Facing } from "./movement";
import type { Look } from "./player";

/**
 * Client → server, when joining: who I am, and where I am if I'm rejoining
 * after a dropped connection (so I don't pop back to the spawn point).
 */
export interface JoinOptions extends Look {
  /** The farmer this device plays, if it knows. */
  farmerId?: string;
  /**
   * True when this device just picked Someone new: the server makes a new farmer and says so in
   * "you". A join with neither this nor a farmerId comes from a page loaded before farmers existed;
   * the server gives it the farmer with the same name and character, so its reconnects don't each
   * make another farmer.
   */
  newFarmer?: boolean;
  x?: number;
  y?: number;
  facing?: Facing;
}

/** Client → server ("move"): where my character is now. */
export interface MoveMessage {
  x: number;
  y: number;
  facing: Facing;
  /** My clock (performance.now()) when I sent this. */
  sentAt: number;
}

/** Client → server ("look"): I changed my name or character. */
export type LookMessage = Look;

/** Client → server ("emote"): show this above my head. */
export interface EmoteMessage {
  emote: EmoteId;
}

/** Server → other clients ("emote"): show this above that player's head. */
export interface EmoteEvent {
  sessionId: string;
  emote: EmoteId;
}

// ---------- Dev commands (refused when NODE_ENV is production) ----------

/** What a dev command does: start the night now, set the clock (value: game minutes after midnight), or add coins (value: how many). */
export type DevCommand = "nextDay" | "setTime" | "addCoins";

/** Client → server ("dev"): a shortcut for testing. Also on window.dev in the browser console. */
export interface DevMessage {
  command: DevCommand;
  value?: number;
}

// ---------- Who's playing ----------

/** GET /api/farmers: everyone who has played, for the Who's playing screen. */
export interface FarmerSummary {
  id: string;
  name: string;
  character: CharacterId;
}

/** Server → client ("you"), after joining as someone new: the farmer id to remember on this device. */
export interface YouMessage {
  farmerId: string;
}

/**
 * Server → client ("replaced"): the same farmer just joined on another device, so this one is
 * being disconnected (with close code REPLACED_CLOSE_CODE) and mustn't reconnect by itself.
 */
export type ReplacedMessage = Record<string, never>;
