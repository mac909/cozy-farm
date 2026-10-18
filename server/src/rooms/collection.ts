import type { Client } from "colyseus";
import type { CollectResult } from "../../../shared/collection/collect";
import type { BookEventMessage } from "../../../shared/messages";
import type { FarmRoom } from "./FarmRoom";

/**
 * Applies something collected (a beach find, a fish, a bug): the world changes, or the player is
 * told why not. Anything new in the book is announced to everyone, so both screens celebrate.
 * Returns whether it worked.
 */
export function applyCollected(room: FarmRoom, client: Client, result: CollectResult): boolean {
  if (!result.ok) {
    room.hint(client, result.hint);
    return false;
  }
  room.change(result.world);
  const by = room.state.players.get(client.sessionId)?.name ?? "";
  for (const event of result.events) {
    room.broadcast("bookEvent", { event, by, sessionId: client.sessionId } satisfies BookEventMessage);
  }
  return true;
}
