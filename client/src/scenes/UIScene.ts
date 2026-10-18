import Phaser from "phaser";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import type { Look } from "../../../shared/player";
import type { GameClock } from "../../../shared/time/clock";
import { characterKey, EMOTES_KEY, emoteFrame, UI_ICON, UI_ICONS_KEY } from "../art/assets";
import { loadMuted, saveMuted } from "../audio/music";
import type { NetStatus } from "../net/connection";
import { ClockCard } from "../ui/ClockCard";
import { Joystick } from "../ui/Joystick";
import { RoundButton } from "../ui/RoundButton";
import { safeArea } from "../ui/safeArea";

/** Keyboard shortcuts for emotes: the Phaser key name, and the label shown on the button. */
const EMOTE_KEYS: Record<EmoteId, { key: string; label: string }> = {
  wave: { key: "ONE", label: "1" },
  heart: { key: "TWO", label: "2" },
};

const EMOTE_BUTTON_SIZE = 60;
const CORNER_BUTTON_SIZE = 46;
const MARGIN = 14;
const GAP = 12;

/**
 * Screen-space HUD and controls, drawn above the world at zoom 1.
 * Emits "emote" (with an EmoteId) and "editLook" for WorldScene to act on.
 * Reads "netStatus", "look" and "clock" from the game registry, which WorldScene keeps up to date.
 */
export class UIScene extends Phaser.Scene {
  joystick?: Joystick;
  private clockCard!: ClockCard;
  private emoteButtons: RoundButton[] = [];
  private lookButton!: RoundButton;
  private musicButton!: RoundButton;
  /** Kept here because Phaser applies sound.mute a moment later, so reading it straight back can be stale. */
  private muted = loadMuted();

  constructor() {
    super("ui");
  }

  create() {
    this.joystick = new Joystick(this);

    this.clockCard = new ClockCard(this);
    this.showClock();
    this.onRegistry("netStatus", () => this.showClock());
    this.onRegistry("clock", () => this.showClock());

    // Key hints only make sense where there's a keyboard.
    const showHints = !this.sys.game.device.input.touch;
    this.emoteButtons = EMOTES.map(
      ({ id }) =>
        new RoundButton(this, {
          size: EMOTE_BUTTON_SIZE,
          icon: EMOTES_KEY,
          iconFrame: emoteFrame(id),
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
      size: CORNER_BUTTON_SIZE,
      icon: characterKey(look.character),
      iconFrame: 0,
      iconScale: 2,
      onPress: () => this.events.emit("editLook"),
    });
    this.onRegistry("look", (value: Look) => this.lookButton.setIcon(characterKey(value.character), 0));

    this.musicButton = new RoundButton(this, {
      size: CORNER_BUTTON_SIZE,
      icon: UI_ICONS_KEY,
      iconFrame: this.musicIcon(),
      iconScale: 2,
      onPress: () => this.toggleMusic(),
    });

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  /** Clock card top left; music and look buttons top right; emotes bottom right: all clear of notches and the home bar. */
  private layout() {
    const { width, height } = this.scale;
    const safe = safeArea();
    const left = safe.left + MARGIN;
    const right = width - safe.right - MARGIN;
    const top = safe.top + MARGIN;
    const bottom = height - safe.bottom - MARGIN;

    this.clockCard.setPosition(left, top);
    const corner = CORNER_BUTTON_SIZE / 2;
    this.lookButton.setPosition(right - corner, top + corner);
    this.musicButton.setPosition(right - corner - (CORNER_BUTTON_SIZE + GAP), top + corner);

    const r = EMOTE_BUTTON_SIZE / 2;
    // The last emote sits in the corner; the others line up to its left.
    this.emoteButtons.forEach((button, i) => {
      const fromRight = this.emoteButtons.length - 1 - i;
      button.setPosition(right - r - fromRight * (EMOTE_BUTTON_SIZE + GAP), bottom - r);
    });
  }

  private showClock() {
    this.clockCard.show({
      clock: (this.registry.get("clock") as GameClock | undefined) ?? null,
      status: this.registry.get("netStatus") as NetStatus,
      sleepers: null,
    });
  }

  /** Mutes or unmutes all sound, and remembers it on this device. */
  private toggleMusic() {
    this.muted = !this.muted;
    this.sound.mute = this.muted;
    saveMuted(this.muted);
    this.musicButton.setIcon(UI_ICONS_KEY, this.musicIcon());
  }

  private musicIcon() {
    return this.muted ? UI_ICON.musicOff : UI_ICON.musicOn;
  }

  private onRegistry<T>(key: string, handler: (value: T) => void) {
    const listener = (_parent: unknown, value: T) => handler(value);
    this.registry.events.on(`changedata-${key}`, listener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.registry.events.off(`changedata-${key}`, listener));
  }
}
