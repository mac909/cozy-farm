// Every message between client and server. Each feature has its own section, so features built side by side only meet in small additions.

import type { BookEvent } from "./collection/collection";
import type { CharacterId } from "./content/characters";
import type { EmoteId } from "./content/emotes";
import type { Hint } from "./farming/actions";
import type { CastingState } from "./fishing/fishing";
import type { Facing } from "./movement";
import type { Look } from "./player";
import type { VillageEvent } from "./village/projects";
import type { ProgressEvent } from "./progress/progress";
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

/**
 * What a dev command does: start the night now, set the clock (value: game minutes after midnight),
 * add coins (value: how many), fill a project's step as if everything was given (project: which,
 * or the open one), build what's been gathered now instead of overnight, or add experience to one
 * of your skills (skill, value: how much).
 */
export type DevCommand = "nextDay" | "setTime" | "addCoins" | "fillStep" | "build" | "xp";

/** Client → server ("dev"): a shortcut for testing. Also on window.dev in the browser console. */
export interface DevMessage {
  command: DevCommand;
  value?: number;
  project?: string;
  skill?: string;
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

// ---------- Arranging furniture and decorations ----------
// All in map tiles. The server works out where you are from your position: in your own house's
// room (furniture), or out in the village (decorations on the farm).

/** Client → server ("placePiece"): put one piece of furniture from my bag slot `slot` down at col, row, turned `turn`. */
export interface PlacePieceMessage {
  slot: number;
  col: number;
  row: number;
  turn: number;
}

/** Client → server ("movePiece"): move (or turn) the `itemId` whose top-left tile is col, row to toCol, toRow, turned `turn`. */
export interface MovePieceMessage {
  itemId: string;
  col: number;
  row: number;
  toCol: number;
  toRow: number;
  turn: number;
}

/** Client → server ("takePiece"): put the `itemId` whose top-left tile is col, row back in my bag. */
export interface TakePieceMessage {
  itemId: string;
  col: number;
  row: number;
}

// ---------- Collecting: the beach, fishing, bugs and the book ----------

/** Client → server ("pickUp"): pick up the beach find lying on col, row (in reach). */
export interface PickUpMessage {
  col: number;
  row: number;
}

/** Client → server ("cast"), holding the fishing rod: cast into the water tile col, row (the one in front). */
export interface CastMessage {
  col: number;
  row: number;
}

/**
 * Server → the caster ("castStarted"): the line, as the fishing rules' casting state. The device
 * plays it out (the bite, the reel) and says "landFish" if it's landed. The fish was picked here,
 * from the spot and the time of day; the device shows it only once it's caught.
 */
export interface CastStartedMessage {
  state: CastingState;
}

/** Client → server ("landFish"): the fish on the line is landed, and this long. */
export interface LandFishMessage {
  sizeCm: number;
}

/**
 * Client → server ("reelIn"): stopped fishing without landing anything. `gotAway`: a hooked fish
 * got away (a little fishing experience: you learn from those too).
 */
export interface ReelInMessage {
  gotAway?: boolean;
}

/** Client → server ("catchBug"): catch the bug with this id (it's fluttering next to me). */
export interface CatchBugMessage {
  id: string;
}

/**
 * Server → everyone ("bookEvent"): something to celebrate in the collection book: a first discovery,
 * a record fish, a section or the whole book done. `by` found it; `sessionId` is theirs, so each
 * screen can put sparkles over the right head.
 */
export interface BookEventMessage {
  event: BookEvent;
  by: string;
  sessionId: string;
}

// ---------- The village: Marlow, the board and the projects (Milestone 6) ----------

/**
 * Client → server ("give"), at the Village Board: give to the need `need` ("driftwood",
 * "any:fish", "coins") of `project`'s step being gathered. With `slot`, from that bag slot (the
 * Action button's "Give 7"); without, as many as I can from my whole bag, cheapest first for "any
 * of a kind", or coins from the shared wallet. Only as many as are still wanted.
 */
export interface GiveMessage {
  project: string;
  need: string;
  slot?: number;
}

/** Client → server ("giveAll"), at the board: everything in my bag the step wants. Never coins. */
export interface GiveAllMessage {
  project: string;
}

/**
 * Server → everyone ("villageEvent"): a gift (it floats up from the board) or a step's last thing
 * going in (the cheer on both screens). `by` gave it; `sessionId` is theirs, so each screen can
 * put a heart over the right head.
 */
export interface VillageEventMessage {
  event: VillageEvent;
  by: string;
  sessionId: string;
}

/**
 * Server → client ("placed"), on joining: where you said you were isn't somewhere you can stand on
 * today's map (a stale tab, a map edit), so you're at the spawn point instead.
 */
export interface PlacedMessage {
  x: number;
  y: number;
}

// ---------- Skills and badges (Milestone 7) ----------

/**
 * Server → one farmer's device ("progress"): a level reached, a gift for it, a badge. Only ever sent
 * to the farmer it's about: skills are personal, so the other screen never hears about them.
 * (Village badges go to everyone because everyone earns them.)
 */
export interface ProgressMessage {
  events: ProgressEvent[];
}

/** Client → server ("climb"): I've climbed the lit lighthouse for the view (Up the Lighthouse, after dark). */
export type ClimbMessage = Record<string, never>;
