import type { YouSeen } from "./youText";

/**
 * What the You card last showed on this device, per farmer (Milestone 7), so the gold dot on your
 * face button only shows for a level or a badge you haven't looked at yet. Storage can be
 * unavailable; then everything counts as seen once the card is opened this time.
 */

const key = (farmerId: string) => `cozy-farm.youSeen.${farmerId}`;

export function loadSeen(farmerId: string): YouSeen {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(farmerId)) ?? "null") as Partial<YouSeen> | null;
    return {
      levels: parsed && typeof parsed.levels === "object" && parsed.levels !== null ? parsed.levels : {},
      badges: Array.isArray(parsed?.badges) ? parsed.badges.filter((b): b is string => typeof b === "string") : [],
    };
  } catch {
    return { levels: {}, badges: [] };
  }
}

export function saveSeen(farmerId: string, seen: YouSeen): void {
  try {
    localStorage.setItem(key(farmerId), JSON.stringify(seen));
  } catch {
    // Not remembered: the dot may show again next time.
  }
}

const TAB_KEY = "cozy-farm.youTab";

/** The tab the You card opens on: the one last looked at on this device. */
export function loadYouTab(): "skills" | "badges" {
  try {
    return localStorage.getItem(TAB_KEY) === "badges" ? "badges" : "skills";
  } catch {
    return "skills";
  }
}

export function saveYouTab(tab: "skills" | "badges"): void {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    // Not remembered.
  }
}
