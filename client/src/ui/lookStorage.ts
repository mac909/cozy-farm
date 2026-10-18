import { cleanName, type Look, lookFrom } from "../../../shared/player";

const LOOK_KEY = "cozy-farm.look";

/** The name and shirt picked on this device, or null if none yet. Storage can be unavailable (e.g. private browsing), so failures just mean "none". */
export function loadLook(): Look | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "null");
    if (!cleanName((saved as { name?: unknown } | null)?.name)) return null;
    return lookFrom(saved);
  } catch {
    return null;
  }
}

export function saveLook(look: Look): void {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify(look));
  } catch {
    // Not remembered on this device; they'll be asked again next time.
  }
}
