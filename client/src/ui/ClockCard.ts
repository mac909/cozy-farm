import Phaser from "phaser";
import { formatTime, type GameClock } from "../../../shared/time/clock";
import { COIN_KEY, MOON_KEY, SUN_KEY, ZZZ_KEY } from "../art/assets";
import type { NetStatus } from "../net/connection";

/** From 6 pm the sun turns into a moon. */
export const EVENING_MINUTE = 18 * 60;
/** From 10 pm the card turns amber and says it's getting late. */
export const LATE_MINUTE = 22 * 60;

const PAD_X = 12;
const PAD_Y = 6;
const RADIUS = 14;
const LINE_GAP = 4;
const BG = 0x1d2f3b;
const BG_ALPHA = 0.62;
const LATE_BG = 0x965c16;
const LATE_ALPHA = 0.82;

const STATUS_TEXT: Record<NetStatus, string> = {
  connecting: "Connecting…",
  connected: "",
  reconnecting: "○ Reconnecting…",
  replaced: "○ Playing on another device",
};

export interface ClockCardView {
  /** Null until the first clock arrives from the server. */
  clock: GameClock | null;
  /** The shared wallet, or null until it arrives. */
  coins: number | null;
  status: NetStatus;
  /** Who else is asleep, as words ("Pip is asleep"), or null. */
  sleepers: string | null;
}

/**
 * The card in the top left: sun or moon, the day and the time in 10-minute steps, a chip when
 * someone else is asleep, and the connection status underneath when it isn't connected.
 */
export class ClockCard extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly time: Phaser.GameObjects.Text;
  private readonly coinIcon: Phaser.GameObjects.Image;
  private readonly coins: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly chipBg: Phaser.GameObjects.Graphics;
  private readonly chipIcon: Phaser.GameObjects.Image;
  private readonly chipText: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private shown = "";

  constructor(scene: Phaser.Scene) {
    super(scene);
    const text = (size: number, bold = true) =>
      scene.add.text(0, 0, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: `${size}px`,
        fontStyle: bold ? "bold" : "normal",
        color: "#ffffff",
        resolution: window.devicePixelRatio,
      });
    this.bg = scene.add.graphics();
    this.icon = scene.add.image(0, 0, SUN_KEY).setOrigin(0, 0.5);
    this.time = text(15).setOrigin(0, 0.5);
    this.coinIcon = scene.add.image(0, 0, COIN_KEY).setScale(2).setOrigin(0, 0.5);
    this.coins = text(14).setOrigin(0, 0.5);
    this.note = text(13).setOrigin(0, 0);
    this.chipBg = scene.add.graphics();
    this.chipIcon = scene.add.image(0, 0, ZZZ_KEY).setOrigin(0, 0.5);
    this.chipText = text(13).setOrigin(0, 0.5);
    this.status = scene.add
      .text(0, 0, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        padding: { x: 8, y: 2 },
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0, 0);
    this.add([this.bg, this.icon, this.time, this.coinIcon, this.coins, this.note, this.chipBg, this.chipIcon, this.chipText, this.status]);
    scene.add.existing(this);
  }

  /** Redraws, if anything on the card changed. */
  show(view: ClockCardView) {
    const key = JSON.stringify(view);
    if (key === this.shown) return;
    this.shown = key;
    const { clock, coins, status, sleepers } = view;

    const hasClock = clock !== null;
    const hasCoins = hasClock && coins !== null;
    this.coinIcon.setVisible(hasCoins);
    this.coins.setVisible(hasCoins).setText(hasCoins ? coins.toLocaleString("en-US") : "");
    const minute = clock?.minute ?? 0;
    const late = hasClock && minute >= LATE_MINUTE;
    this.bg.setVisible(hasClock);
    this.icon.setVisible(hasClock).setTexture(minute >= EVENING_MINUTE ? MOON_KEY : SUN_KEY);
    this.time.setVisible(hasClock).setText(hasClock ? `Day ${clock.day} · ${formatTime(minute)}` : "");
    this.note.setVisible(late).setText(late ? "It's getting late" : "");
    const hasChip = hasClock && sleepers !== null;
    this.chipBg.setVisible(hasChip);
    this.chipIcon.setVisible(hasChip);
    this.chipText.setVisible(hasChip).setText(sleepers ?? "");

    // Lay the card out from the top down.
    const rowHeight = Math.max(this.icon.height, this.time.height);
    let y = PAD_Y + rowHeight / 2;
    this.icon.setPosition(PAD_X - 4, y);
    this.time.setPosition(PAD_X - 4 + this.icon.width + 4, y);
    let width = this.time.x + this.time.width;
    y += rowHeight / 2;
    if (hasCoins) {
      const coinRow = Math.max(this.coinIcon.displayHeight, this.coins.height);
      y += 1 + coinRow / 2;
      this.coinIcon.setPosition(PAD_X - 4 + (this.icon.width - this.coinIcon.displayWidth) / 2, y);
      this.coins.setPosition(this.time.x, y);
      width = Math.max(width, this.coins.x + this.coins.width);
      y += coinRow / 2;
    }
    if (late) {
      this.note.setPosition(PAD_X, y);
      width = Math.max(width, PAD_X + this.note.width);
      y += this.note.height;
    }
    if (hasChip) {
      y += LINE_GAP;
      const chipHeight = Math.max(this.chipIcon.height, this.chipText.height) + 4;
      const chipWidth = 4 + this.chipIcon.width + 6 + this.chipText.width + 8;
      this.chipBg.clear().fillStyle(0xffffff, 0.18).fillRoundedRect(PAD_X - 4, y, chipWidth, chipHeight, 10);
      this.chipIcon.setPosition(PAD_X, y + chipHeight / 2);
      this.chipText.setPosition(PAD_X + this.chipIcon.width + 6, y + chipHeight / 2);
      width = Math.max(width, PAD_X - 4 + chipWidth);
      y += chipHeight;
    }
    const cardHeight = y + PAD_Y;
    const cardWidth = width + PAD_X;
    this.bg
      .clear()
      .fillStyle(late ? LATE_BG : BG, late ? LATE_ALPHA : BG_ALPHA)
      .fillRoundedRect(0, 0, cardWidth, cardHeight, RADIUS)
      .lineStyle(2, 0xffffff, 0.6)
      .strokeRoundedRect(0, 0, cardWidth, cardHeight, RADIUS);

    const statusText = STATUS_TEXT[status];
    this.status.setVisible(statusText !== "").setText(statusText).setPosition(0, hasClock ? cardHeight + 6 : 0);
  }
}
