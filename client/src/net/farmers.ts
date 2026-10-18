import { isCharacter } from "../../../shared/player";
import type { FarmerSummary } from "../../../shared/messages";
import { isFarmerId } from "../../../shared/world/world";
import { retryDelay } from "./retry";

/**
 * Everyone who has played, from the game server (in dev, Vite passes /api on to it). Keeps
 * trying until the server answers: a device that can't reach it mustn't start as someone new.
 */
export async function fetchFarmers(): Promise<FarmerSummary[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch("/api/farmers", { cache: "no-store" });
      if (response.ok) return farmersFrom(await response.json());
    } catch {
      // The server isn't up yet, or the Wi-Fi dropped: try again in a moment.
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
  }
}

/** The farmers in a response, skipping anything that doesn't look like one. */
export function farmersFrom(data: unknown): FarmerSummary[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry): FarmerSummary[] => {
    const { id, name, character } = (entry ?? {}) as Record<string, unknown>;
    return isFarmerId(id) && typeof name === "string" && isCharacter(character) ? [{ id, name, character }] : [];
  });
}
