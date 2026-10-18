import { Client, type Room } from "colyseus.js";
import { FARM_ROOM, SERVER_PORT } from "../../../shared/constants";
import type { FarmState } from "../../../shared/schema";

export type NetStatus = "connecting" | "connected" | "offline";

/**
 * In dev the page comes from Vite, so the game server is on its own port.
 * In the real build the game server serves the page itself.
 */
function serverUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.DEV ? `${location.hostname}:${SERVER_PORT}` : location.host;
  return `${protocol}//${host}`;
}

/** Joins the shared world. Resolves to null if the server can't be reached, so the game still runs solo. */
export async function joinFarm(onStatus: (status: NetStatus) => void): Promise<Room<FarmState> | null> {
  onStatus("connecting");
  try {
    const room = await new Client(serverUrl()).joinOrCreate<FarmState>(FARM_ROOM);
    onStatus("connected");
    room.onLeave(() => onStatus("offline"));
    return room;
  } catch (error) {
    console.warn("Could not reach the game server:", error);
    onStatus("offline");
    return null;
  }
}
