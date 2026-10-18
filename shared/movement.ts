export type Facing = "up" | "down" | "left" | "right";
export const FACINGS: readonly Facing[] = ["up", "down", "left", "right"];

export function isFacing(value: unknown): value is Facing {
  return FACINGS.includes(value as Facing);
}

export interface Vec {
  x: number;
  y: number;
}

/** Fraction of the joystick radius that counts as "not moving". */
export const STICK_DEAD_ZONE = 0.15;

/** Limits a movement direction to length 1, so diagonals aren't faster than straight lines. */
export function clampMove(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

/**
 * Turns a joystick drag (pixels from where the thumb went down) into a
 * movement direction of length 0–1. Small drags count as standing still.
 */
export function stickToMove(dx: number, dy: number, radius: number): Vec {
  const len = Math.hypot(dx, dy);
  const strength = Math.min(len / radius, 1);
  if (strength < STICK_DEAD_ZONE) return { x: 0, y: 0 };
  return { x: (dx / len) * strength, y: (dy / len) * strength };
}

/**
 * A joystick push lighter than this (but past the dead zone) turns you on the spot without
 * walking, so lining up on one tile is easy.
 */
export const TURN_ONLY_STRENGTH = 0.4;

/** Whether a joystick direction only turns you (a light push), rather than walking. */
export function turnsOnly(stick: Vec): boolean {
  const strength = Math.hypot(stick.x, stick.y);
  return strength > 0 && strength < TURN_ONLY_STRENGTH;
}

/** Which way a character faces while moving in direction (x, y). Standing still keeps the current facing. */
export function facingFor(x: number, y: number, current: Facing): Facing {
  if (x === 0 && y === 0) return current;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  return y < 0 ? "up" : "down";
}
