import type { DevMessage } from "../../../shared/messages";

/** Shortcuts for testing from the browser console, in dev only. The server refuses them on the real farm. */
export interface DevCommands {
  /** Start the night now: crops grow, the crate sells, the next morning comes. */
  nextDay(): void;
  /** Set the clock, e.g. dev.setTime("23:50"), dev.setTime("9:30 pm") or dev.setTime(1430) (game minutes). */
  setTime(time: string | number): void;
  /** Add coins to the shared wallet. */
  addCoins(amount: number): void;
}

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

/** Puts the dev commands on window.dev. `send` passes them to the server, if connected. */
export function installDevCommands(send: (message: DevMessage) => void): void {
  if (!import.meta.env.DEV) return;
  window.dev = {
    nextDay: () => send({ command: "nextDay" }),
    setTime: (time) => {
      const value = parseTime(time);
      if (Number.isNaN(value)) console.warn(`dev.setTime: "${time}" isn't a time. Try "23:50" or "9:30 pm".`);
      else send({ command: "setTime", value });
    },
    addCoins: (amount) => send({ command: "addCoins", value: amount }),
  };
}
