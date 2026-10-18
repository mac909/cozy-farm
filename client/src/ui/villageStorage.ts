/**
 * What this device remembers about the village (Milestone 6): which of Marlow's notes each farmer
 * has read here, and which projects' opening cards it has shown. Like the morning card, once per
 * device. Storage can be unavailable; then everything shows again next time, which does no harm.
 */

const NOTES_KEY = "cozy-farm.notesRead";
const OPENINGS_KEY = "cozy-farm.openingsShown";

function load(key: string): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function save(key: string, value: Record<string, string[]>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not remembered.
  }
}

/** The notes `farmer` has read on this device (note ids: "first", "lighthouse/path", …). */
export function notesRead(farmer: string): Set<string> {
  const list = load(NOTES_KEY)[farmer];
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === "string") : []);
}

export function markNoteRead(farmer: string, noteId: string): void {
  const all = load(NOTES_KEY);
  const read = new Set(Array.isArray(all[farmer]) ? all[farmer] : []);
  read.add(noteId);
  all[farmer] = [...read];
  save(NOTES_KEY, all);
}

/** Whether this device has shown a project's opening card. */
export function openingShown(projectId: string): boolean {
  return (load(OPENINGS_KEY).device ?? []).includes(projectId);
}

export function markOpeningShown(projectId: string): void {
  const all = load(OPENINGS_KEY);
  all.device = [...new Set([...(all.device ?? []), projectId])];
  save(OPENINGS_KEY, all);
}
