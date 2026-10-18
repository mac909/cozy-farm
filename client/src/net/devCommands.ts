import type { DevMessage } from "../../../shared/messages";

/** Shortcuts for testing from the browser console, in dev only. The server refuses them on the real farm. */
export interface DevCommands {
  /** Start the night now: crops grow, the crate sells, the next morning comes. */
  nextDay(): void;
  /** Set the clock, e.g. dev.setTime("23:50"), dev.setTime("9:30 pm") or dev.setTime(1430) (game minutes). */
  setTime(time: string | number): void;
  /** Add coins to the shared wallet. */
  addCoins(amount: number): void;
  /**
   * Fill the board's open step as if everything was given (the cheer comes on every screen):
   * dev.give() for the village's (or else your porch), dev.give("house2:porch") for that one.
   */
  give(project?: string): void;
  /** Experience in one of your skills: dev.xp("fishing", 100). Levels, gifts and badges come as in play. */
  xp(skill: "farming" | "fishing" | "foraging", amount: number): void;
  /** Build whatever's been gathered now, instead of overnight. */
  build(): void;
  /**
   * Walk there in a blink (your own character only): dev.goTo("dock"), "dockEnd", "beach", "meadow",
   * "tent", "board", "point", "pointEnd", or dev.goTo(28, 30) for a tile.
   */
  goTo(place: DevPlace | number, row?: number): void;
}

/** Handy spots for dev.goTo, as tiles: where you stand, and which way you face. */
export const DEV_PLACES = {
  dock: { col: 27, row: 29, facing: "left" },
  dockEnd: { col: 28, row: 33, facing: "down" },
  beach: { col: 10, row: 25, facing: "down" },
  meadow: { col: 32, row: 10, facing: "down" },
  tent: { col: 7, row: 15, facing: "down" },
  board: { col: 34, row: 16, facing: "up" },
  point: { col: 60, row: 31, facing: "up" },
  pointEnd: { col: 60, row: 32, facing: "down" },
} as const;

export type DevPlace = keyof typeof DEV_PLACES;

declare global {
  interface Window {
    dev?: DevCommands;
  }
}

/** Game minutes after midnight for "23:50", "11:50 pm", "6am" or a number of minutes; NaN if it isn't a time. */
export function parseTime(time: string | number): number {
  if (typeof time === "number") return time;
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i.exec(time);
  if (!match) return Number.NaN;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const half = match[3]?.toLowerCase();
  if (minute > 59 || hour > 24 || (half && (hour < 1 || hour > 12))) return Number.NaN;
  if (half === "am" && hour === 12) hour = 0;
  if (half === "pm" && hour < 12) hour += 12;
  return hour * 60 + minute;
}

/** Puts the dev commands on window.dev. `send` passes them to the server, if connected; `goTo` moves you to a tile. */
export function installDevCommands(
  send: (message: DevMessage) => void,
  goTo: (col: number, row: number, facing: "up" | "down" | "left" | "right") => void,
): void {
  if (!import.meta.env.DEV) return;
  window.dev = {
    goTo: (place, row) => {
      if (typeof place === "number" && typeof row === "number") goTo(place, row, "down");
      else if (typeof place === "string" && Object.hasOwn(DEV_PLACES, place)) {
        const spot = DEV_PLACES[place];
        goTo(spot.col, spot.row, spot.facing);
      } else console.warn(`dev.goTo: try ${Object.keys(DEV_PLACES).join(", ")}, or a column and a row.`);
    },
    nextDay: () => send({ command: "nextDay" }),
    setTime: (time) => {
      const value = parseTime(time);
      if (Number.isNaN(value)) console.warn(`dev.setTime: "${time}" isn't a time. Try "23:50" or "9:30 pm".`);
      else send({ command: "setTime", value });
    },
    addCoins: (amount) => send({ command: "addCoins", value: amount }),
    give: (project) => send({ command: "fillStep", ...(typeof project === "string" ? { project } : {}) }),
    xp: (skill, amount) => send({ command: "xp", skill, value: amount }),
    build: () => send({ command: "build" }),
  };
}
