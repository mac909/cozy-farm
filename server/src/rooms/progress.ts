import type { ProgressMessage } from "../../../shared/messages";
import { awardBadges, awardEveryone } from "../../../shared/progress/badges";
import { handOverGifts, recordDeed, type Deed, type ProgressEvent } from "../../../shared/progress/progress";
import { randomSource, type RandomSource } from "../../../shared/random/random";
import type { FarmerId } from "../../../shared/world/world";
import type { FarmRoom } from "./FarmRoom";

/**
 * Skills and badges (Milestone 7): every way of doing something that counts comes through here
 * (picking, catching, finding, giving, putting things down, the night, the view), so it all counts
 * the same. Levels, gifts and badges go to that farmer's own device only ("progress" messages);
 * the village's badges come to everyone because everyone earns them.
 */

/** A fresh random source for a perk's roll (one more crop, two fish), from the server's own randomness. */
export function serverRandom(): RandomSource {
  return randomSource(Math.floor(Math.random() * 2 ** 32));
}

/** A farmer did something that counts: their experience, counts and badges, and the news to their device. */
export function credit(room: FarmRoom, farmerId: FarmerId, deed: Deed) {
  const { world, events } = recordDeed(room.world, farmerId, deed);
  if (world !== room.world) room.change(world);
  tell(room, farmerId, events);
}

/** Tells a farmer's own device about their levels, gifts and badges. Nobody else hears. */
export function tell(room: FarmRoom, farmerId: FarmerId, events: readonly ProgressEvent[]) {
  if (events.length === 0) return;
  for (const event of events) {
    const what = event.type === "levelUp" ? `${event.skill} level ${event.level}` : event.type === "badge" ? `the ${event.badge} badge` : `${event.type} ${event.itemId}`;
    console.log(`${room.world.farmers[farmerId]?.name ?? farmerId}: ${what}`);
  }
  for (const client of room.clients) {
    if (room.state.players.get(client.sessionId)?.farmerId === farmerId) client.send("progress", { events: [...events] } satisfies ProgressMessage);
  }
}

/**
 * Everyone's badges, after something that changes the world for everyone (the night, the lamp
 * being lit at dusk): the village's go to every farmer, and whoever's online hears now.
 */
export function checkEveryone(room: FarmRoom) {
  const { world, awarded } = awardEveryone(room.world);
  if (world === room.world) return;
  room.change(world);
  for (const [farmerId, badges] of Object.entries(awarded)) tell(room, farmerId, badges.map((badge) => ({ type: "badge", badge })));
}

/**
 * A farmer joined: any gift that waited for room in their bag, and any badge that follows from the
 * world as it is (a cottage of their own, the lighthouse lit), which is how the badges for what's
 * already done come after the update.
 */
export function catchUp(room: FarmRoom, farmerId: FarmerId) {
  const gifts = handOverGifts(room.world, farmerId);
  const badges = awardBadges(gifts.world, farmerId);
  if (badges.world !== room.world) room.change(badges.world);
  tell(room, farmerId, [...gifts.given.map((itemId) => ({ type: "gift" as const, itemId })), ...badges.badges.map((badge) => ({ type: "badge" as const, badge }))]);
}
