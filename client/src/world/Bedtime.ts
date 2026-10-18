import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { MorningMessage, SleepMessage, WakeMessage, WakeUpMessage } from "../../../shared/messages";
import type { Vec } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import type { GameClock } from "../../../shared/time/clock";
import { sleepersText, waitingText } from "../../../shared/world/bedtime";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { MorningReport } from "../../../shared/world/world";
import { CAMP_KEY, TENT_FRAME, ZZZ_KEY } from "../art/assets";
import { showMorningCard } from "../ui/MorningCard";
import { loadMorningShown, saveMorningShown } from "../ui/morningText";
import { button, el, openPanel, type Panel } from "../ui/panel";
import type { Character } from "./Character";

/** At 11:30 pm a hint says it's nearly midnight. */
const NEARLY_MIDNIGHT = 23 * 60 + 30;

/** The Zzz floats over the tent, above characters and tree tops. */
const ZZZ_DEPTH = 1_000_000;

export interface BedtimeOptions {
  room(): Room<FarmState> | null;
  /** Whether a player is out in the village (the tent's Zzz is for them; beds in houses have their own). */
  inVillage(player: { x: number; y: number }): boolean;
  me: Character;
  /** Puts your own character somewhere (clients own their position), facing down. */
  wakeAt(x: number, y: number): void;
  /** Fades the whole screen to dark, calls `atDark`, and back; then `done`. */
  fade(atDark: () => void, done: () => void): void;
  /** Closes any open panel (the night doesn't wait for the bag to be tidied). */
  closePanels(): void;
  /** Passes what the HUD shows: whether you're in bed, and who else is asleep. */
  show(view: { inBed: boolean; sleepers: string | null }): void;
  /** The coin picture, as an image URL for the morning card. */
  coinIcon(): string;
  /** The morning card just opened (for its sound). */
  morningShown?(report: MorningReport): void;
  /** The morning card was closed (keys let go while it was open are forgotten). */
  cardClosed?(): void;
}

/**
 * The tent and going to bed, on this device: the tent in the world with a Zzz over it while
 * anyone sleeps, hiding sleepers, the "Sleeping…" banner with Get up, getting up with the
 * joystick, keys or Esc, the fade when the night comes, and the morning card.
 */
export class Bedtime {
  /** You're in bed, as the server last said. */
  private inBed = false;
  /** Asked the server to get up and waiting to hear back, so it's asked once. */
  private wakeAsked = false;
  /** Input has been let go since going to bed, so a key still held from walking there doesn't get you straight up. */
  private wakeArmed = false;
  /** From the night starting until the screen comes back. */
  private night = false;
  private pendingMorning: MorningReport | null = null;
  private banner: Panel | null = null;
  private bannerText: HTMLElement | null = null;
  private lateHintDay = 0;
  private readonly zzz: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly options: BedtimeOptions,
  ) {
    // The tent stands on its spot from the map, sorted with the characters by its bottom edge,
    // so you can walk behind its top.
    const tent = VILLAGE_MAP.tent;
    scene.add.image(tent.x, tent.y, CAMP_KEY, TENT_FRAME).setOrigin(0, 0).setDepth(tent.y + tent.height);
    this.zzz = scene.add
      .image(tent.x + tent.width / 2 + 6, tent.y + 6, ZZZ_KEY)
      .setOrigin(0.5, 1)
      .setDepth(ZZZ_DEPTH)
      .setVisible(false);
    scene.tweens.add({ targets: this.zzz, y: tent.y + 2, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  /** You're asleep, or the night is on: you can't walk or act. */
  get asleep(): boolean {
    return this.inBed || this.night;
  }

  /** Tap Sleep by the tent. */
  sleep() {
    this.options.room()?.send("sleep", {} satisfies SleepMessage);
  }

  /** Get up (the button, the joystick, a key, or Esc). */
  wake() {
    if (!this.inBed || this.wakeAsked || this.night) return;
    this.wakeAsked = true;
    this.options.room()?.send("wake", {} satisfies WakeMessage);
  }

  /** Every frame, with the joystick or keys: returns whether your character must stay still. */
  holdStill(move: Vec): boolean {
    if (this.night) return true;
    if (!this.inBed) return false;
    const moving = move.x !== 0 || move.y !== 0;
    if (!moving) this.wakeArmed = true;
    else if (this.wakeArmed) this.wake();
    return true;
  }

  /** After every update from the server: who's in bed. */
  readState(state: FarmState, mySessionId: string) {
    const me = state.players.get(mySessionId);
    const inBed = me?.inBed ?? false;
    const asleep: string[] = [];
    const awake: string[] = [];
    let inTent = 0;
    state.players.forEach((player, sessionId) => {
      if (player.inBed && this.options.inVillage(player)) inTent++;
      if (sessionId !== mySessionId) (player.inBed ? asleep : awake).push(player.name);
    });
    this.zzz.setVisible(inTent > 0);

    if (inBed !== this.inBed) {
      this.inBed = inBed;
      this.wakeAsked = false;
      this.wakeArmed = false;
      if (inBed) this.options.closePanels();
      this.showBanner(inBed);
    }
    this.options.me.setHidden(this.asleep);
    this.bannerText?.replaceChildren(waitingText(awake));
    this.options.show({ inBed, sleepers: inBed ? null : sleepersText(asleep) });
  }

  /** The clock moved: at 11:30 pm, once a day, a hint that it's nearly midnight. */
  clock(clock: GameClock | null) {
    if (!clock || clock.minute < NEARLY_MIDNIGHT || this.lateHintDay === clock.day || this.asleep) return;
    this.lateHintDay = clock.day;
    this.options.me.showHint("Nearly midnight. Time for bed!");
  }

  /** The night started: fade out, wake up in front of the tent, fade in, then the morning card. */
  wakeUp(message: WakeUpMessage) {
    if (!Number.isFinite(message?.x) || !Number.isFinite(message?.y)) return;
    this.night = true;
    this.options.closePanels();
    this.options.me.setHidden(true);
    this.options.fade(
      () => this.options.wakeAt(message.x, message.y),
      () => {
        this.night = false;
        this.options.me.setHidden(this.inBed);
        const report = this.pendingMorning;
        this.pendingMorning = null;
        if (report) this.showMorning(report);
      },
    );
  }

  /** What the night did: shown after the fade, or straight away for someone who missed it. Once per day per device. */
  morning(report: MorningMessage) {
    if (!Number.isInteger(report?.day) || report.day <= loadMorningShown()) return;
    if (this.night) this.pendingMorning = report;
    else this.showMorning(report);
  }

  /** The morning card is up. */
  get cardOpen(): boolean {
    return this.morningOpen;
  }

  private morningOpen = false;

  private showMorning(report: MorningReport) {
    saveMorningShown(report.day);
    this.morningOpen = true;
    this.options.morningShown?.(report);
    void showMorningCard(report, this.options.coinIcon()).then(() => {
      this.morningOpen = false;
      this.options.cardClosed?.();
    });
  }

  private showBanner(inBed: boolean) {
    if (!inBed) {
      this.banner?.close();
      this.banner = null;
      this.bannerText = null;
      return;
    }
    if (this.banner) return;
    const panel = openPanel({ cardClass: "bed", position: "bottom", passThrough: true });
    this.bannerText = el("div", "bed-text");
    panel.card.append(el("div", "bed-title", "Sleeping…"), this.bannerText, button("Get up", "panel-button soft", () => this.wake()));
    this.banner = panel;
  }
}
