import type { World } from "../../../shared/world/world";
import { messageOf } from "../persistence/errors";
import { WORLD_ID, worldToSave, type WorldSave } from "../persistence/worldSave";

/** Wait this long after a change before saving, so a burst of changes is one write. */
export const SAVE_DELAY_MS = 2000;

/** Where the world gets saved: a SaveStore in the game, a fake in tests. */
export interface WorldSaver {
  save(worldId: string, save: WorldSave): void;
  close(): void;
}

/**
 * The one shared world while the server runs: the source of truth the room reads and changes, and
 * the thing that gets saved. Loaded once at startup (server/src/index.ts), before anyone can join.
 */
export class LiveWorld {
  private current: World;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly saver: WorldSaver,
    world: World,
    private readonly saveDelayMs = SAVE_DELAY_MS,
  ) {
    this.current = world;
  }

  get world(): World {
    return this.current;
  }

  /**
   * Replaces the world and saves it soon. Pass `save: false` for changes too small to be worth a
   * write by themselves (the clock creeping on between its 10-minute steps); the next save takes
   * them along.
   */
  set(next: World, { save = true }: { save?: boolean } = {}): void {
    this.current = next;
    if (save) this.saveSoon();
  }

  /** Saves SAVE_DELAY_MS from now, unless a save is already on its way. */
  saveSoon(): void {
    if (this.saveTimer !== undefined) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      this.saveNow();
    }, this.saveDelayMs);
  }

  /**
   * Saves right away. If it fails (a full disk, say), it says so loudly and carries on: the world
   * in memory is fine, and the next change tries again. Returns whether it saved.
   */
  saveNow(): boolean {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    try {
      this.saver.save(WORLD_ID, worldToSave(this.current));
      return true;
    } catch (error) {
      console.error(`\n!!! COULDN'T SAVE THE FARM: ${messageOf(error)}\n!!! Still playing; the next change tries again.\n`);
      return false;
    }
  }

  /** Saves and closes the save database. For shutting down. */
  close(): void {
    this.saveNow();
    this.saver.close();
  }
}

let live: LiveWorld | undefined;

/** Called once at startup with the loaded world. */
export function setLiveWorld(world: LiveWorld): void {
  live = world;
}

/** The running world. Throws if the server hasn't loaded it yet. */
export function liveWorld(): LiveWorld {
  if (!live) throw new Error("The world hasn't been loaded yet: server/src/index.ts loads it before listening.");
  return live;
}
