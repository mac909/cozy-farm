import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { TILE_SIZE } from "../../../shared/constants";
import { FISHING_ROD } from "../../../shared/content/items";
import { FISHING, isFinished, tick, type FishingEvent, type FishingState } from "../../../shared/fishing/fishing";
import { bobberTile } from "../../../shared/fishing/spots";
import type { CastMessage, CastStartedMessage, LandFishMessage, ReelInMessage } from "../../../shared/messages";
import { facingFor, type Facing } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { tileCenter, type TilePos } from "../../../shared/world/map";
import { feetTile } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { BITE_KEY, FISHING_FRAME, FISHING_KEY } from "../art/assets";
import { iconScale, itemIcon } from "../art/itemIcons";
import { playSound } from "../audio/sounds";
import type { ActionView } from "../ui/ActionButton";
import { CASTING_VIEW, catchText, fishingHud, fishingWord, MISS_TEXT, type FishingHudView } from "../ui/fishingText";
import type { Character } from "./Character";
import { playBurst } from "./effects";

/** The bobber floats over the water (and over finds on the sand), under everyone. */
const BOBBER_DEPTH = -400;
/** How long a catch shows (the fish held up) before you can cast again. */
const SHOW_CATCH_MS = 1300;
/** How long the bite's "!" stays up: as long as a quick fish's bite. */
const BITE_BUBBLE_MS = 1100;

export interface FishingOptions {
  me: Character;
  room(): Room<FarmState> | null;
  /** Turns your character to face somewhere. */
  face(facing: Facing): void;
  showAction(view: ActionView): void;
  /** The strip at the top of the screen (and the Stop button in place of the bag), or null to put them away. */
  showHud(view: FishingHudView | null): void;
  /** Whether the Action button, Space or Enter is held down. */
  holding(): boolean;
  /** Whether a pointer is over one of the HUD's buttons (those touches aren't the reel). */
  overHud(pointer: Phaser.Input.Pointer): boolean;
  /** The HUD scene's input: it's on top, so it hears every touch on the screen. */
  hudInput: Phaser.Input.InputPlugin;
  /** A touch screen: the words say Tap and Hold rather than Press and Hold Space. */
  touch: boolean;
  /** A cast is over, with or without a fish (for the tips). */
  ended?(caught: boolean): void;
}

/** Where the rod's handle sits by the character, and where its tip is, for each way you face (pixels from the sprite's middle). */
const ROD: Record<Facing, { x: number; y: number; flip: boolean; tip: { x: number; y: number }; behind: boolean }> = {
  right: { x: 3, y: 6, flip: false, tip: { x: 12, y: -7 }, behind: false },
  left: { x: -3, y: 6, flip: true, tip: { x: -12, y: -7 }, behind: false },
  down: { x: 2, y: 7, flip: false, tip: { x: 11, y: -6 }, behind: false },
  up: { x: 2, y: 3, flip: false, tip: { x: 11, y: -10 }, behind: true },
};

/**
 * Fishing on this device: the rod in your hands, the cast, the bobber, the line, and the
 * minigame's one button (the Action button, Space, or a touch anywhere on the screen): tap when the
 * bobber dips, then hold to reel, letting go while the fish pulls. The server picks the fish when
 * you cast; this plays the line out with the shared rules and says when it's landed. Walking with
 * the keys, Esc or Stop reels in. Nothing is ever lost: a miss just means casting again.
 */
export class Fishing {
  private mode: "off" | "asking" | "line" | "landed" = "off";
  private state: FishingState | null = null;
  private pressed = false;
  /** Touches held down on the screen (not on a button): they count as holding the reel. */
  private readonly pointers = new Set<number>();
  private water: TilePos = { col: 0, row: 0 };
  private rest = { x: 0, y: 0 };
  private flight = 1;
  private landedAt = 0;
  private readonly rod: Phaser.GameObjects.Image;
  private readonly bobber: Phaser.GameObjects.Image;
  private readonly line: Phaser.GameObjects.Graphics;
  private flightTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: FishingOptions,
  ) {
    this.rod = scene.add.image(0, 0, FISHING_KEY, FISHING_FRAME.rod).setOrigin(0.2, 0.95).setVisible(false);
    this.bobber = scene.add.image(0, 0, FISHING_KEY, FISHING_FRAME.bobber).setDepth(BOBBER_DEPTH).setVisible(false);
    this.line = scene.add.graphics().setDepth(BOBBER_DEPTH + 1);
    const input = options.hudInput;
    input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.mode === "off" || options.overHud(pointer)) return;
      this.pointers.add(pointer.id);
      this.pressed = true;
    });
    const release = (pointer: Phaser.Input.Pointer) => this.pointers.delete(pointer.id);
    input.on(Phaser.Input.Events.POINTER_UP, release);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** Fishing, from the cast until the catch has been shown. */
  get isActive(): boolean {
    return this.mode !== "off";
  }

  /** The Action button with the rod, facing water: cast into tile (col, row). */
  start(col: number, row: number) {
    const room = this.options.room();
    if (!room || this.isActive) return;
    const feet = feetTile(this.options.me.sprite);
    const facing = facingFor(col - feet.col, row - feet.row, this.options.me.facingNow);
    this.options.face(facing);
    this.mode = "asking";
    this.state = null;
    this.pressed = false;
    this.water = { col, row };
    const bobber = bobberTile(VILLAGE_MAP, feet, this.water);
    const at = tileCenter(bobber.col, bobber.row);
    this.rest = { x: at.x, y: at.y + 2 };
    room.send("cast", { col, row } satisfies CastMessage);
    this.options.me.swing(facing);
    playSound(this.scene, "tap");
    this.castOut();
  }

  /** The server sent the line: the fish is on its way. */
  started(message: CastStartedMessage) {
    if (this.mode !== "asking" || message?.state?.phase !== "casting") {
      // Stopped while the cast was on its way (or it makes no sense): reel it straight back in.
      this.options.room()?.send("reelIn", {} satisfies ReelInMessage);
      return;
    }
    this.state = message.state;
    this.pressed = false;
    this.mode = "line";
  }

  /** The server said no (no water here after all, a full bag, nothing biting): the hint says why. */
  refused() {
    if (this.mode === "asking") this.finish(false);
  }

  /** The Action button, Space or Enter while fishing. */
  press() {
    if (this.mode === "line") this.pressed = true;
  }

  /** Reels in without landing anything: Stop, Esc, walking off, a card opening, the night. */
  stop() {
    if (this.mode === "off") return;
    if (this.mode !== "landed") this.options.room()?.send("reelIn", {} satisfies ReelInMessage);
    this.finish(false);
  }

  /** Every frame: plays the line on by `dtMs`, and draws it. */
  update(dtMs: number) {
    if (this.mode === "off") return;
    if (this.mode === "line" && this.state && !isFinished(this.state)) {
      const holding = this.options.holding() || this.pointers.size > 0;
      const step = tick(this.state, dtMs, { pressed: this.pressed, holding });
      this.pressed = false;
      this.state = step.state;
      for (const event of step.events) this.happened(event);
      // A miss ends it there and then.
      if (!this.isActive) return;
    }
    if (this.mode === "landed" && performance.now() - this.landedAt > SHOW_CATCH_MS) {
      this.finish(true);
      return;
    }
    this.draw();
    this.showButtons();
  }

  private happened(event: FishingEvent) {
    const { x, y } = this.rest;
    switch (event.type) {
      case "landed":
        playBurst(this.scene, x, y, "splash", BOBBER_DEPTH + 2);
        playSound(this.scene, "water", 0.5);
        break;
      case "nibble":
        this.scene.tweens.add({ targets: this.bobber, y: y + 2, duration: 90, yoyo: true });
        break;
      case "bite":
        playBurst(this.scene, x, y, "splash", BOBBER_DEPTH + 2);
        playSound(this.scene, "pick");
        this.options.me.showBubble(BITE_KEY, undefined, BITE_BUBBLE_MS);
        navigator.vibrate?.(60);
        break;
      case "hooked":
        this.options.me.hideBubble();
        this.options.me.swing(this.options.me.facingNow);
        playSound(this.scene, "tap");
        break;
      case "tug-start":
        playSound(this.scene, "water", 0.35);
        break;
      case "tug-end":
        break;
      case "caught":
        this.caught(event.fishId, event.sizeCm);
        break;
      case "missed":
        this.options.me.hideBubble();
        this.options.me.showHint(MISS_TEXT[event.reason]);
        this.options.room()?.send("reelIn", {} satisfies ReelInMessage);
        this.finish(false);
        break;
    }
  }

  /** Landed: the fish leaps out of the water into your hands, and its name and size show over your head. */
  private caught(fishId: Parameters<typeof catchText>[0], sizeCm: number) {
    this.options.room()?.send("landFish", { sizeCm } satisfies LandFishMessage);
    this.mode = "landed";
    this.landedAt = performance.now();
    const { x, y } = this.rest;
    playBurst(this.scene, x, y, "splash", BOBBER_DEPTH + 2);
    playSound(this.scene, "pick");
    const me = this.options.me.sprite;
    const icon = itemIcon(fishId);
    const fish = this.scene.add.image(x, y, icon.key, icon.frame).setDepth(me.depth + 2);
    const to = { x: me.x, y: me.y - 14 };
    const leap = { t: 0 };
    this.scene.tweens.add({
      targets: leap,
      t: 1,
      duration: 450,
      ease: "Sine.easeOut",
      onUpdate: () => fish.setPosition(x + (to.x - x) * leap.t, y + (to.y - y) * leap.t - Math.sin(Math.PI * leap.t) * 18),
      onComplete: () => this.scene.tweens.add({ targets: fish, alpha: 0, delay: 650, duration: 250, onComplete: () => fish.destroy() }),
    });
    this.options.me.showHint(catchText(fishId, sizeCm));
  }

  /** The bobber flies out from the rod's tip in an arc. */
  private castOut() {
    const from = this.tip();
    this.flight = 0;
    this.flightTween?.stop();
    this.bobber.setFrame(FISHING_FRAME.bobber).setVisible(true).setAlpha(1);
    this.flightTween = this.scene.tweens.add({
      targets: this,
      flight: 1,
      duration: FISHING.castMs - 80,
      ease: "Sine.easeOut",
      onUpdate: () => {
        const t = this.flight;
        this.bobber.setPosition(from.x + (this.rest.x - from.x) * t, from.y + (this.rest.y - from.y) * t - Math.sin(Math.PI * t) * 22);
      },
    });
  }

  /** The rod by your side, the bobber on the water, and the line between them. */
  private draw() {
    const me = this.options.me.sprite;
    const facing = this.options.me.facingNow;
    const rod = ROD[facing];
    this.rod
      .setVisible(true)
      .setFlipX(rod.flip)
      .setOrigin(rod.flip ? 0.8 : 0.2, 0.95)
      .setPosition(Math.round(me.x + rod.x), Math.round(me.y + rod.y))
      .setDepth(me.depth + (rod.behind ? -1 : 1));

    const state = this.state;
    if (this.flight >= 1 && this.mode !== "landed") {
      const time = this.scene.time.now;
      let { x, y } = this.rest;
      let frame: number = FISHING_FRAME.bobber;
      if (state?.phase === "waiting") y += Math.sin(time / 400) * 0.8;
      if (state?.phase === "bite") {
        frame = FISHING_FRAME.dipped;
        x += Math.sin(time / 30);
      }
      if (state?.phase === "reeling") {
        // Drawn in towards you as it's reeled; jerking about while it pulls.
        const tip = this.tip();
        x += (tip.x - x) * state.progress * 0.5;
        y += (tip.y + 10 - y) * state.progress * 0.5;
        if (state.tugging) {
          frame = FISHING_FRAME.dipped;
          x += Math.sin(time / 25) * 1.5;
        }
      }
      if (!this.scene.tweens.isTweening(this.bobber)) this.bobber.setPosition(Math.round(x), Math.round(y));
      this.bobber.setFrame(frame);
    }
    this.bobber.setVisible(this.mode !== "landed");

    const tip = this.tip();
    const end = { x: this.bobber.x, y: this.bobber.y - 4 };
    const slack = this.state?.phase === "reeling" ? 1 : 6;
    this.line.clear();
    if (this.mode === "landed") return;
    this.line.lineStyle(1, 0xffffff, 0.75).beginPath().moveTo(tip.x, tip.y);
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      this.line.lineTo(tip.x + (end.x - tip.x) * t, tip.y + (end.y - tip.y) * t + Math.sin(Math.PI * t) * slack);
    }
    this.line.strokePath();
  }

  /** Where the rod's tip is in the world. */
  private tip(): { x: number; y: number } {
    const me = this.options.me.sprite;
    const rod = ROD[this.options.me.facingNow];
    return { x: Math.round(me.x + rod.x + rod.tip.x), y: Math.round(me.y + rod.y + rod.tip.y) };
  }

  private showButtons() {
    const state = this.state;
    const icon = itemIcon(FISHING_ROD);
    this.options.showAction({ icon, iconScale: iconScale(icon, 48), word: fishingWord(state), faded: false });
    this.options.showHud(state ? fishingHud(state, this.options.touch) ?? (this.mode === "landed" ? null : CASTING_VIEW) : CASTING_VIEW);
  }

  private finish(caught: boolean) {
    this.mode = "off";
    this.state = null;
    this.pressed = false;
    this.pointers.clear();
    this.flightTween?.stop();
    this.flight = 1;
    this.rod.setVisible(false);
    this.bobber.setVisible(false);
    this.line.clear();
    this.options.showHud(null);
    this.options.ended?.(caught);
  }
}

/**
 * Other players' lines: their bobber where the server says it floats, and a line from them to it.
 * Each screen shows its own fishing in full; this is just so you can see each other fish.
 */
export class OtherLines {
  private readonly drawn = new Map<
    string,
    { rod: Phaser.GameObjects.Image; bobber: Phaser.GameObjects.Image; line: Phaser.GameObjects.Graphics }
  >();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Every frame, with everyone else: who's fishing (their bobber's tile), where they stand and face, and whether they're in view. */
  update(others: readonly { id: string; x: number; y: number; depth: number; facing: Facing; fishing: string; visible: boolean }[]) {
    const seen = new Set<string>();
    for (const other of others) {
      const match = /^(\d+),(\d+)$/.exec(other.fishing);
      if (!match || !other.visible) continue;
      seen.add(other.id);
      let drawn = this.drawn.get(other.id);
      if (!drawn) {
        drawn = {
          rod: this.scene.add.image(0, 0, FISHING_KEY, FISHING_FRAME.rod),
          bobber: this.scene.add.image(0, 0, FISHING_KEY, FISHING_FRAME.bobber).setDepth(BOBBER_DEPTH),
          line: this.scene.add.graphics().setDepth(BOBBER_DEPTH + 1),
        };
        this.drawn.set(other.id, drawn);
      }
      const rod = ROD[other.facing];
      drawn.rod
        .setFlipX(rod.flip)
        .setOrigin(rod.flip ? 0.8 : 0.2, 0.95)
        .setPosition(Math.round(other.x + rod.x), Math.round(other.y + rod.y))
        .setDepth(other.depth + (rod.behind ? -1 : 1));
      const at = tileCenter(Number(match[1]), Number(match[2]));
      const bob = Math.sin(this.scene.time.now / 400) * 0.8;
      drawn.bobber.setPosition(at.x, Math.round(at.y + 2 + bob));
      const tip = { x: Math.round(other.x + rod.x + rod.tip.x), y: Math.round(other.y + rod.y + rod.tip.y) };
      drawn.line.clear().lineStyle(1, 0xffffff, 0.6).lineBetween(tip.x, tip.y, at.x, at.y - 2);
    }
    for (const [id, drawn] of this.drawn) {
      if (seen.has(id)) continue;
      drawn.rod.destroy();
      drawn.bobber.destroy();
      drawn.line.destroy();
      this.drawn.delete(id);
    }
  }
}
