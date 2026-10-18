// Every message between client and server. Each feature has its own section, so features built side by side only meet in small additions.

import type { CharacterId } from "./content/characters";
import type { EmoteId } from "./content/emotes";
import type { Hint } from "./farming/actions";
import type { Facing } from "./movement";
import type { Look } from "./player";
import type { MorningReport } from "./world/world";

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

// ---------- Farming ----------

/**
 * Client → server ("till", "plant", "water" or "harvest"): do this to the farm tile at col, row.
 * Messages name the action, so a late "harvest" (the other player picked it first) just fails
 * rather than turning into something else. "plant" says which bag slot holds the seeds.
 */
export interface FarmActionMessage {
  col: number;
  row: number;
  slot?: number;
}

/** Server → client ("hint"): an action failed for a reason the client couldn't see coming. */
export type HintMessage = Hint;

// ---------- Bedtime ----------

/** Client → server ("sleep"): go to bed in the tent (only next to its door). */
export type SleepMessage = Record<string, never>;

/** Client → server ("wake"): get up again before the night starts. */
export type WakeMessage = Record<string, never>;

/**
 * Server → client ("morning"): what the night did. Sent to everyone when it ends, and to each
 * player as they join, so whoever missed it can catch up (the device remembers the last day it showed).
 */
export type MorningMessage = MorningReport;

/** Server → client ("wakeUp"), when the night ends: where to wake up, in world pixels. Clients move their own character. */
export interface WakeUpMessage {
  x: number;
  y: number;
}

// ---------- The bag ----------

/** Client → server ("moveItem"): move the stack in bag slot `from` onto slot `to` (swapping, or joining the same item). */
export interface MoveItemMessage {
  from: number;
  to: number;
}

/** Client → server ("splitStack"): split `count` off the stack in slot `from`, into the empty slot `to` or the first empty one. */
export interface SplitStackMessage {
  from: number;
  count: number;
  to?: number;
}

// ---------- The shipping crate ----------

/** Client → server ("ship"), next to the crate: put `count` from my bag slot `slot` in the crate. */
export interface ShipMessage {
  slot: number;
  count: number;
}

/** Client → server ("unship"), next to the crate: take `count` of `itemId` back out into my bag. */
export interface UnshipMessage {
  itemId: string;
  count: number;
}

// ---------- The seed stand and the general store ----------

/**
 * Client → server ("buy"), next to the seed stand or the general store (`at`, the seed stand if
 * left out): buy `count` (1–99) of `itemId` with the shared coins.
 */
export interface BuyMessage {
  itemId: string;
  count: number;
  at?: "seedStand" | "store";
}

// ---------- Houses ----------

/** Client → server ("moveIn"), at an empty cottage's door: it's mine now. Going in and out is the client's own move. */
export interface MoveInMessage {
  house: string;
}
