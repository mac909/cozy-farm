import { isFarmerId, type FarmerId } from "../../../shared/world/world";

const FARMER_KEY = "cozy-farm.farmerId";

/**
 * Which farmer this device plays, or null if it hasn't picked one yet. The id comes from the
 * server; the device only remembers it. Storage can be unavailable (e.g. private browsing), so
 * failures just mean "not picked yet".
 */
export function loadFarmerId(): FarmerId | null {
  try {
    const saved = localStorage.getItem(FARMER_KEY);
    return isFarmerId(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveFarmerId(id: FarmerId | null): void {
  try {
    if (id) localStorage.setItem(FARMER_KEY, id);
    else localStorage.removeItem(FARMER_KEY);
  } catch {
    // Not remembered; this device asks who's playing again next time.
  }
}
