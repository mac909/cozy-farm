import type { Facing } from "./movement";

/** Client → server: where my character is now. */
export interface MoveMessage {
  x: number;
  y: number;
  facing: Facing;
}
