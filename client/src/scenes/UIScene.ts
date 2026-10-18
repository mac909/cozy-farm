import Phaser from "phaser";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import type { Look } from "../../../shared/player";
import { emoteIconKey, playerTextureKey } from "../art/placeholderArt";
import type { NetStatus } from "../net/connection";
import { Joystick } from "../ui/Joystick";
import { RoundButton } from "../ui/RoundButton";
import { safeArea } from "../ui/safeArea";

const STATUS_TEXT: Record<NetStatus, string> = {
  connecting: "Connecting…",
  connected: "● Connected",
  reconnecting: "○ Reconnecting…",
};

/** Keyboard shortcuts for emotes: the Phaser key name, and the label shown on the button. */
const EMOTE_KEYS: Record<EmoteId, { key: string; label: string }> = {
  wave: { key: "ONE", label: "1" },
  heart: { key: "TWO", label: "2" },
};

const EMOTE_BUTTON_SIZE = 60;
const LOOK_BUTTON_SIZE = 46;
const MARGIN = 14;
const GAP = 12;

/**
 * Screen-space HUD and controls, drawn above the world at zoom 1.
 * Emits "emote" (with an EmoteId) and "editLook" for WorldScene to act on.
 */
export class UIScene extends Phaser.Scene {
  joystick?: Joystick;
  private status!: Phaser.GameObjects.Text;
  private emoteButtons: RoundButton[] = [];
  private lookButton!: RoundButton;

  constructor() {
    super("ui");
  }

  create() {
    this.joystick = new Joystick(this);

    this.status = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      padding: { x: 6, y: 3 },
      resolution: window.devicePixelRatio,
    });
    this.showStatus(this.registry.get("netStatus"));
    this.onRegistry("netStatus", (status: NetStatus) => this.showStatus(status));

    // Key hints only make sense where there's a keyboard.
    const showHints = !this.sys.game.device.input.touch;
    this.emoteButtons = EMOTES.map(
      ({ id }) =>
        new RoundButton(this, {
          size: EMOTE_BUTTON_SIZE,
          icon: emoteIconKey(id),
          iconScale: 3,
          hint: showHints ? EMOTE_KEYS[id].label : undefined,
          onPress: () => this.events.emit("emote", id),
        }),
    );
    for (const { id } of EMOTES) {
      this.input.keyboard?.on(`keydown-${EMOTE_KEYS[id].key}`, (event: KeyboardEvent) => {
        if (!event.repeat) this.events.emit("emote", id);
      });
    }

    const look: Look = this.registry.get("look");
    this.lookButton = new RoundButton(this, {
      size: LOOK_BUTTON_SIZE,
      icon: playerTextureKey(look.color),
      iconFrame: 0,
      iconScale: 2,
      onPress: () => this.events.emit("editLook"),
    });
    this.onRegistry("look", (value: Look) => this.lookButton.setIcon(playerTextureKey(value.color), 0));

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  /** Status top left, look button top right, emotes bottom right: all clear of notches and the home bar. */
  private layout() {
    const { width, height } = this.scale;
    const safe = safeArea();
    const left = safe.left + MARGIN;
    const right = width - safe.right - MARGIN;
    const top = safe.top + MARGIN;
    const bottom = height - safe.bottom - MARGIN;

    this.status.setPosition(left, top);
    this.lookButton.setPosition(right - LOOK_BUTTON_SIZE / 2, top + LOOK_BUTTON_SIZE / 2);

    const r = EMOTE_BUTTON_SIZE / 2;
    // The last emote sits in the corner; the others line up to its left.
    this.emoteButtons.forEach((button, i) => {
      const fromRight = this.emoteButtons.length - 1 - i;
      button.setPosition(right - r - fromRight * (EMOTE_BUTTON_SIZE + GAP), bottom - r);
    });
  }

  private showStatus(status: NetStatus) {
    this.status.setText(STATUS_TEXT[status]);
  }

  private onRegistry<T>(key: string, handler: (value: T) => void) {
    const listener = (_parent: unknown, value: T) => handler(value);
    this.registry.events.on(`changedata-${key}`, listener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.registry.events.off(`changedata-${key}`, listener));
  }
}
