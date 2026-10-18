import Phaser from "phaser";
import type { NetStatus } from "../net/connection";
import { Joystick } from "../ui/Joystick";

const STATUS_TEXT: Record<NetStatus, string> = {
  connecting: "Connecting…",
  connected: "● Connected",
  offline: "○ Offline (playing solo)",
};

/** Screen-space HUD and controls, drawn above the world at zoom 1. */
export class UIScene extends Phaser.Scene {
  joystick?: Joystick;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("ui");
  }

  create() {
    this.joystick = new Joystick(this);

    this.status = this.add.text(8, 8, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      padding: { x: 6, y: 3 },
      resolution: window.devicePixelRatio,
    });
    this.showStatus(this.registry.get("netStatus"));
    this.registry.events.on("changedata-netStatus", (_parent: unknown, value: NetStatus) => this.showStatus(value));
  }

  private showStatus(status: NetStatus) {
    this.status.setText(STATUS_TEXT[status]);
  }
}
