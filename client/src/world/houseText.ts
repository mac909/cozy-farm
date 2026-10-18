import { nameList } from "../../../shared/world/bedtime";

/** Someone in a room: who, and whether it's their own house. */
export interface Occupant {
  name: string;
  farmerId: string;
}

/** The sign over a cottage: whose it is, or that nobody lives there yet. */
export function houseSign(ownerName: string | null): string {
  return ownerName ? `${ownerName}'s house` : "Empty cottage";
}

/**
 * Who's in a cottage right now, for the line under its sign: "Pip is home", "Juno is visiting",
 * "Pip is home, Juno is visiting". Null when nobody is.
 */
export function insideText(owner: string | null, inside: readonly Occupant[]): string | null {
  if (inside.length === 0) return null;
  const home = inside.filter((o) => o.farmerId === owner).map((o) => o.name);
  const visiting = inside.filter((o) => o.farmerId !== owner).map((o) => o.name);
  const parts: string[] = [];
  if (home.length > 0) parts.push(`${nameList(home)} ${home.length === 1 ? "is" : "are"} home`);
  if (visiting.length > 0) parts.push(`${nameList(visiting)} ${visiting.length === 1 ? "is" : "are"} ${owner ? "visiting" : "looking round"}`);
  return parts.join(", ");
}
