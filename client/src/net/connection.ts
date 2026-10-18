import { Client, type Room } from "colyseus.js";
import { FARM_ROOM, REPLACED_CLOSE_CODE, SERVER_PORT } from "../../../shared/constants";
import type { JoinOptions } from "../../../shared/messages";
import type { FarmState } from "../../../shared/schema";
import { retryDelay } from "./retry";

export type NetStatus = "connecting" | "connected" | "reconnecting" | "replaced";

export interface ConnectionEvents {
  status(status: NetStatus): void;
  /** Called each time we're in the room, including after every reconnect (with a new Room object). */
  joined(room: Room<FarmState>): void;
  /** The connection dropped. Everything from the old room is stale. */
  lost(): void;
  /**
   * The same farmer joined on another device, so the server let this one go. It doesn't reconnect
   * by itself (or two devices would knock each other off forever); call resume() to play here again.
   */
  replaced(): void;
}

/**
 * In dev the page comes from Vite, so the game server is on its own port.
 * In the real build the game server serves the page itself.
 */
function serverUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.DEV ? `${location.hostname}:${SERVER_PORT}` : location.host;
  return `${protocol}//${host}`;
}

/**
 * Keeps us in the shared world. If the server can't be reached or the connection drops
 * (a Wi-Fi blip, a phone waking up, the server restarting), it keeps retrying, waiting a
 * little longer each time. The game stays playable solo in the meantime.
 *
 * Rejoining is a fresh join: the server forgets a player as soon as they drop, and the
 * join options carry our name, look, and where we were standing.
 */
export class FarmConnection {
  private readonly client = new Client(serverUrl());
  private room: Room<FarmState> | null = null;
  private attempt = 0;
  private retryTimer: number | undefined;
  private stopped = false;

  constructor(
    private readonly joinOptions: () => JoinOptions,
    private readonly events: ConnectionEvents,
  ) {
    window.addEventListener("online", this.retryNow);
    document.addEventListener("visibilitychange", this.retryNow);
  }

  start() {
    this.events.status("connecting");
    void this.join();
  }

  /** After being replaced by another device: join again, which in turn replaces that one. */
  resume() {
    if (this.room || this.stopped) return;
    this.attempt = 0;
    this.events.status("connecting");
    void this.join();
  }

  /** Leaves for good (no reconnecting). */
  stop() {
    this.stopped = true;
    window.clearTimeout(this.retryTimer);
    window.removeEventListener("online", this.retryNow);
    document.removeEventListener("visibilitychange", this.retryNow);
    void this.room?.leave();
  }

  private async join() {
    this.retryTimer = undefined;
    let room: Room<FarmState>;
    try {
      // The server makes the one room when it starts, so joining never creates another.
      room = await this.client.join<FarmState>(FARM_ROOM, this.joinOptions());
    } catch (error) {
      console.warn("Could not reach the game server:", error);
      this.retryLater();
      return;
    }
    if (this.stopped) {
      void room.leave();
      return;
    }
    this.room = room;
    this.attempt = 0;
    // Colyseus closes with the same code whether we left or the server shut down,
    // so reconnect unless we asked to stop.
    room.onLeave((code) => {
      if (this.room !== room) return;
      this.room = null;
      this.events.lost();
      if (code === REPLACED_CLOSE_CODE) {
        this.events.status("replaced");
        this.events.replaced();
      } else if (!this.stopped) {
        this.retryLater();
      }
    });
    room.onError((code, message) => console.warn(`Room error ${code}:`, message));
    this.events.status("connected");
    this.events.joined(room);
  }

  private retryLater() {
    if (this.stopped) return;
    this.events.status("reconnecting");
    this.retryTimer = window.setTimeout(() => void this.join(), retryDelay(this.attempt++));
  }

  /** Back online, or the tab is visible again: skip the rest of the wait. */
  private readonly retryNow = () => {
    if (this.retryTimer === undefined || document.visibilityState === "hidden") return;
    window.clearTimeout(this.retryTimer);
    void this.join();
  };
}
