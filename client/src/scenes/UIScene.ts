import Phaser from "phaser";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import type { Inventory, Slot } from "../../../shared/inventory/inventory";
import type { Look } from "../../../shared/player";
import type { GameClock } from "../../../shared/time/clock";
import { BAG_KEY, characterKey, EMOTES_KEY, emoteFrame, UI_ICON, UI_ICONS_KEY } from "../art/assets";
import { loadMuted, saveMuted } from "../audio/music";
import type { NetStatus } from "../net/connection";
import { ClockCard } from "../ui/ClockCard";
import { Hotbar, slotName } from "../ui/Hotbar";
import { Joystick } from "../ui/Joystick";
import { RoundButton } from "../ui/RoundButton";
import { safeArea } from "../ui/safeArea";

/** Keyboard shortcuts for emotes: the Phaser key name, and the label shown on the button. */
const EMOTE_KEYS: Record<EmoteId, { key: string; label: string }> = {
  wave: { key: "Z", label: "Z" },
  heart: { key: "X", label: "X" },
};

/** Phaser key names for hotbar slots 1–8. */
const SLOT_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"];

const SMALL_BUTTON_SIZE = 46;
const BAG_BUTTON_SIZE = 52;
/** The Action button's size; it's the biggest thing on screen, because it's the most used. */
export const ACTION_SIZE = 76;
const MARGIN = 14;
const GAP = 12;
/** How long an item's name shows above the hotbar after picking its slot. */
const TOAST_MS = 1500;

/** Where everything goes on this screen. Computed from the screen size, so it follows rotation. */
interface Layout {
  upright: boolean;
  hotbar: { x: number; y: number; size: number; gap: number };
  /** Top-left corners. */
  action: { x: number; y: number };
  emotes: { x: number; y: number }[];
  bag: { x: number; y: number };
  toastY: number;
}

/**
 * Screen-space HUD and controls, drawn above the world at zoom 1. The layout follows
 * docs/plans/milestone-2-mockups.html: upright phone (hotbar along the bottom, Action above its
 * right end, emotes beside Action, bag on the left), sideways phone and laptop (hotbar bottom
 * centre, emotes stacked above Action, bag bottom left; key hints on a laptop).
 *
 * Emits "emote" (EmoteId), "editLook", "bag" and "selectSlot" (slot, item) for WorldScene.
 * Reads "netStatus", "look", "clock" and "bag" from the game registry, which WorldScene keeps up to date.
 */
export class UIScene extends Phaser.Scene {
  joystick?: Joystick;
  hotbar!: Hotbar;
  private clockCard!: ClockCard;
  private emoteButtons: RoundButton[] = [];
  private lookButton!: RoundButton;
  private musicButton!: RoundButton;
  private bagButton!: RoundButton;
  private toast!: Phaser.GameObjects.Text;
  private toastTimer?: Phaser.Time.TimerEvent;
  private keyHints = false;
  private layoutNow!: Layout;
  /** Kept here because Phaser applies sound.mute a moment later, so reading it straight back can be stale. */
  private muted = loadMuted();

  constructor() {
    super("ui");
  }

  create() {
    this.joystick = new Joystick(this);
    // Key hints only make sense where there's a keyboard.
    this.keyHints = !this.sys.game.device.input.touch;

    this.clockCard = new ClockCard(this);
    this.showClock();
    this.onRegistry("netStatus", () => this.showClock());
    this.onRegistry("clock", () => this.showClock());

    this.hotbar = new Hotbar(this, (slot, item) => this.onSelectSlot(slot, item));
    this.hotbar.setBag(this.registry.get("bag") ?? null);
    this.onRegistry("bag", (bag: Inventory | null) => this.hotbar.setBag(bag));
    this.registry.set("selectedSlot", this.hotbar.selected);

    this.toast = this.add
      .text(0, 0, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        padding: { x: 10, y: 3 },
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.emoteButtons = EMOTES.map(
      ({ id }) =>
        new RoundButton(this, {
          size: SMALL_BUTTON_SIZE,
          icon: EMOTES_KEY,
          iconFrame: emoteFrame(id),
          iconScale: 2,
          hint: this.keyHints ? EMOTE_KEYS[id].label : undefined,
          onPress: () => this.events.emit("emote", id),
        }),
    );

    this.bagButton = new RoundButton(this, {
      size: BAG_BUTTON_SIZE,
      square: true,
      icon: BAG_KEY,
      iconScale: 2,
      hint: this.keyHints ? "B" : undefined,
      onPress: () => this.events.emit("bag"),
    });

    const look: Look = this.registry.get("look");
    this.lookButton = new RoundButton(this, {
      size: SMALL_BUTTON_SIZE,
      icon: characterKey(look.character),
      iconFrame: 0,
      iconScale: 2,
      onPress: () => this.events.emit("editLook"),
    });
    this.onRegistry("look", (value: Look) => this.lookButton.setIcon(characterKey(value.character), 0));

    this.musicButton = new RoundButton(this, {
      size: SMALL_BUTTON_SIZE,
      icon: UI_ICONS_KEY,
      iconFrame: this.musicIcon(),
      iconScale: 2,
      onPress: () => this.toggleMusic(),
    });

    this.bindKeys();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  private bindKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const onKey = (key: string, action: () => void) =>
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (!event.repeat) action();
      });
    EMOTES.forEach(({ id }, i) =>
      onKey(EMOTE_KEYS[id].key, () => {
        this.emoteButtons[i].press();
        this.events.emit("emote", id);
      }),
    );
    SLOT_KEYS.forEach((key, slot) => onKey(key, () => this.hotbar.select(slot)));
    onKey("Q", () => this.hotbar.select(this.hotbar.selected - 1));
    onKey("E", () => this.hotbar.select(this.hotbar.selected + 1));
    // Tab would move the browser's focus away from the game.
    keyboard.addCapture("TAB");
    for (const key of ["B", "TAB"]) {
      onKey(key, () => {
        this.bagButton.press();
        this.events.emit("bag");
      });
    }
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.hotbar.select(this.hotbar.selected + Math.sign(dy));
    });
  }

  /** Where everything goes, from the screen size and safe area (the notch and home bar). */
  private computeLayout(): Layout {
    const { width, height } = this.scale;
    const safe = safeArea();
    const upright = height > width;
    const size = upright ? 42 : this.keyHints ? 48 : 44;
    const gap = upright ? 3 : 4;
    const hotbarWidth = Hotbar.width(size, gap);
    const hotbar = { x: Math.round((width - hotbarWidth) / 2), y: height - safe.bottom - 8 - size, size, gap };
    const right = width - safe.right - MARGIN;
    const left = safe.left + MARGIN;
    const s = SMALL_BUTTON_SIZE;
    if (upright) {
      const action = { x: right - ACTION_SIZE, y: hotbar.y - 12 - ACTION_SIZE };
      return {
        upright,
        hotbar,
        action,
        emotes: [
          { x: action.x - 12 - s - 8 - s, y: action.y + 30 },
          { x: action.x - 12 - s, y: action.y + 30 },
        ],
        bag: { x: Math.max(left, hotbar.x), y: action.y + ACTION_SIZE - BAG_BUTTON_SIZE },
        toastY: action.y - 8,
      };
    }
    const action = { x: right - ACTION_SIZE, y: hotbar.y + size - ACTION_SIZE };
    const stackX = action.x + (ACTION_SIZE - s) / 2;
    return {
      upright,
      hotbar,
      action,
      emotes: [
        { x: stackX, y: action.y - 12 - s - 8 - s },
        { x: stackX, y: action.y - 12 - s },
      ],
      bag: { x: left, y: hotbar.y + size - BAG_BUTTON_SIZE },
      toastY: hotbar.y - 10,
    };
  }

  private layout() {
    const { width } = this.scale;
    const safe = safeArea();
    const L = (this.layoutNow = this.computeLayout());
    const right = width - safe.right - MARGIN;
    const top = safe.top + (L.upright ? 8 : MARGIN);

    this.clockCard.setPosition(safe.left + MARGIN, top);
    const s = SMALL_BUTTON_SIZE;
    this.lookButton.setPosition(right - s / 2, top + s / 2);
    this.musicButton.setPosition(right - s / 2 - (s + 10), top + s / 2);

    this.hotbar.layout(L.hotbar.x, L.hotbar.y, L.hotbar.size, L.hotbar.gap, this.keyHints);
    this.emoteButtons.forEach((button, i) => button.setPosition(L.emotes[i].x + s / 2, L.emotes[i].y + s / 2));
    this.bagButton.setPosition(L.bag.x + BAG_BUTTON_SIZE / 2, L.bag.y + BAG_BUTTON_SIZE / 2);
    this.toast.setPosition(width / 2, L.toastY);
    this.events.emit("layout", L);
  }

  /** Where the Action button goes (its top-left corner), for whoever draws it. */
  get actionSpot(): { x: number; y: number } {
    return this.layoutNow.action;
  }

  private onSelectSlot(slot: number, item: Slot) {
    this.registry.set("selectedSlot", slot);
    this.showToast(slotName(item));
    this.events.emit("selectSlot", slot, item);
  }

  /** Shows a few words above the hotbar for a moment. */
  showToast(text: string) {
    this.toastTimer?.remove();
    this.toast.setText(text).setVisible(text !== "");
    this.toastTimer = this.time.delayedCall(TOAST_MS, () => this.toast.setVisible(false));
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
