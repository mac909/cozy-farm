import { POSITION_SEND_MS, TILE_SIZE } from "./constants";
import type { Facing } from "./movement";

/**
 * How far in the past other players are drawn, in milliseconds. Positions arrive
 * about every POSITION_SEND_MS, unevenly over Tailscale; drawing a little behind
 * means the next position has nearly always arrived before it's needed.
 */
export const REMOTE_DELAY_MS = 250;

/** A jump longer than this between two updates is a teleport (a respawn, later entering a house), not a walk. */
export const TELEPORT_DISTANCE = 3 * TILE_SIZE;

/** If the sender's clock seems to jump by more than this (they reloaded the page), start timing afresh. */
const RESYNC_MS = 1000;

/** How quickly the clock offset creeps up when updates start arriving later (say, the network route got slower). */
const OFFSET_CREEP = 0.02;

/** Only the last few positions matter; older ones are dropped. */
const MAX_SNAPSHOTS = 20;

interface Snapshot {
  /** On our clock. */
  t: number;
  x: number;
  y: number;
  facing: Facing;
}

export interface Pose {
  x: number;
  y: number;
  facing: Facing;
}

/**
 * Remembers where another player was reported, and works out where to draw them in between.
 *
 * Each report carries the time on the sender's clock. Spacing reports by that, instead of
 * by when they happen to arrive, keeps the walk steady even when the network delivers them
 * in clumps. The two clocks are lined up by the smallest delay seen so far.
 */
export class PositionBuffer {
  private snapshots: Snapshot[] = [];
  /** Our clock minus the sender's clock, plus the quickest delivery time seen. */
  private offset: number | null = null;
  private lastSentAt: number | null = null;

  /**
   * Records a report: the sender was at (x, y) at `sentAt` on their clock; it reached us at `now` on ours.
   * Repeats of the same report (same `sentAt`) are ignored.
   */
  push(now: number, sentAt: number, x: number, y: number, facing: Facing): void {
    if (sentAt === this.lastSentAt) return;
    this.lastSentAt = sentAt;
    const seen = now - sentAt;
    const last = this.snapshots.at(-1);
    if (this.offset === null || Math.abs(seen - this.offset) > RESYNC_MS) {
      this.offset = seen;
      // Keep where they were, so they set off from there rather than jumping.
      this.snapshots = last ? [{ ...last, t: now - POSITION_SEND_MS }] : [];
    } else if (seen < this.offset) {
      this.offset = seen;
    } else {
      this.offset += (seen - this.offset) * OFFSET_CREEP;
    }

    const prev = this.snapshots.at(-1);
    const t = Math.max(sentAt + this.offset, (prev?.t ?? -Infinity) + 1);
    if (prev && Math.hypot(x - prev.x, y - prev.y) > TELEPORT_DISTANCE) {
      this.snapshots = [];
    } else if (prev && t - prev.t > POSITION_SEND_MS * 2) {
      // Standing still sends nothing. After a pause, set off from where they stood one
      // update ago, instead of sliding slowly across the whole pause.
      this.snapshots.push({ ...prev, t: t - POSITION_SEND_MS });
    }
    this.snapshots.push({ t, x, y, facing });
    if (this.snapshots.length > MAX_SNAPSHOTS) this.snapshots.splice(0, this.snapshots.length - MAX_SNAPSHOTS);
  }

  /** Where to draw the character at `t` on our clock (pass now minus REMOTE_DELAY_MS), or null before any report. */
  sample(t: number): Pose | null {
    const s = this.snapshots;
    while (s.length >= 2 && s[1].t <= t) s.shift();
    const a = s[0];
    if (!a) return null;
    const b = s[1];
    if (!b || t <= a.t) return { x: a.x, y: a.y, facing: a.facing };
    const f = (t - a.t) / (b.t - a.t);
    // Facing comes from the step being walked, so they turn as they reach a corner.
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, facing: b.facing };
  }
}
