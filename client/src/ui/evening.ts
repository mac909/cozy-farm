/**
 * A soft blue tint over the world in the evening, getting deeper towards midnight. Full day and
 * night lighting is a later idea; this is the cheap version from the plan.
 */

/** The tint's colour: a dusky blue. */
export const EVENING_COLOR = 0x1e245c;

/** How dark the screen gets while you're in bed. */
export const IN_BED_TINT = 0.55;

const DUSK_START = 17 * 60 + 30;
const NIGHTFALL = 20 * 60;
const MIDNIGHT = 24 * 60;
const AT_NIGHTFALL = 0.2;
const AT_MIDNIGHT = 0.36;

/** The tint's strength (0 to 1) at a game minute: none until 5:30 pm, then deepening to midnight. */
export function eveningTint(minute: number): number {
  if (minute <= DUSK_START) return 0;
  if (minute <= NIGHTFALL) return (AT_NIGHTFALL * (minute - DUSK_START)) / (NIGHTFALL - DUSK_START);
  const f = Math.min(1, (minute - NIGHTFALL) / (MIDNIGHT - NIGHTFALL));
  return AT_NIGHTFALL + (AT_MIDNIGHT - AT_NIGHTFALL) * f;
}
