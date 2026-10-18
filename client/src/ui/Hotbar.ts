import Phaser from "phaser";
import { ITEMS } from "../../../shared/content/items";
import { HOTBAR_SLOTS, type Inventory, type Slot } from "../../../shared/inventory/inventory";
import { iconScale, itemIcon } from "../art/itemIcons";

const SELECTED_KEY = "cozy-farm.hotbarSlot";

/** The hotbar slot picked on this device last time (0 if none). Storage can be unavailable; then it's 0. */
export function loadSelectedSlot(): number {
  try {
    const saved = Number(localStorage.getItem(SELECTED_KEY));
    return Number.isInteger(saved) && saved >= 0 && saved < HOTBAR_SLOTS ? saved : 0;
  } catch {
    return 0;
  }
}

function saveSelectedSlot(slot: number): void {
  try {
    localStorage.setItem(SELECTED_KEY, String(slot));
  } catch {
    // Not remembered; it starts on the first slot next time.
  }
}

const BG = 0x1d2f3b;
const SELECTED_LINE = 0xffd36b;
/** The selected slot is lifted this far. */
const LIFT = 4;

/** One hotbar slot: a frame, the item's picture at 2×, its count, and on a laptop its key. */
class SlotView extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly key: Phaser.GameObjects.Text;
  readonly zone: Phaser.GameObjects.Zone;
  private size = 42;
  private selected = false;

  constructor(scene: Phaser.Scene, index: number) {
    super(scene);
    const text = (size: number, color: string) =>
      scene.add.text(0, 0, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 3,
        resolution: window.devicePixelRatio,
      });
    this.frame = scene.add.graphics();
    this.icon = scene.add.image(0, 0, "__DEFAULT").setScale(2).setVisible(false);
    this.countText = text(11, "#ffffff").setOrigin(1, 1);
    this.key = text(10, "rgba(255,255,255,0.8)").setOrigin(0, 0).setText(String(index + 1));
    this.zone = scene.add.zone(0, 0, 1, 1);
    this.add([this.frame, this.icon, this.countText, this.key, this.zone]);
  }

  setSlot(slot: Slot) {
    if (!slot) {
      this.icon.setVisible(false);
      this.countText.setText("");
      return;
    }
    const icon = itemIcon(slot.itemId);
    this.icon.setTexture(icon.key, icon.frame).setScale(iconScale(icon, 32)).setVisible(true);
    this.countText.setText(slot.count > 1 ? String(slot.count) : "");
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.draw();
  }

  /** Size in screen pixels; the touch zone also covers half the gap on each side, so a near miss still counts. */
  resize(size: number, gap: number, showKey: boolean) {
    this.size = size;
    this.zone.setSize(size + gap, size + LIFT * 2);
    this.key.setVisible(showKey);
    this.draw();
    return this;
  }

  private draw() {
    const { size, selected } = this;
    const lift = selected ? -LIFT : 0;
    const half = size / 2;
    this.frame.clear();
    if (selected) this.frame.fillStyle(0x000000, 0.35).fillRoundedRect(-half - 2, -half - 2 + lift, size + 4, size + 4, 10);
    this.frame
      .fillStyle(BG, selected ? 0.82 : 0.62)
      .fillRoundedRect(-half, -half + lift, size, size, 8)
      .lineStyle(2, selected ? SELECTED_LINE : 0xffffff, selected ? 1 : 0.6)
      .strokeRoundedRect(-half, -half + lift, size, size, 8);
    this.icon.setPosition(0, lift);
    this.countText.setPosition(half - 3, half + lift + 1);
    this.key.setPosition(-half + 4, -half + lift + 1);
    this.zone.setPosition(0, 0);
  }
}

/**
 * The first HOTBAR_SLOTS slots of your bag, along the bottom of the screen. Tap a slot (or press
 * 1–8, Q/E, or scroll) to hold what's in it. The choice is remembered on the device, and a slot
 * stays chosen when it empties, so planting the last seed doesn't jump to something else.
 */
export class Hotbar extends Phaser.GameObjects.Container {
  private readonly views: SlotView[] = [];
  private bag: Inventory | null = null;
  selected = loadSelectedSlot();

  constructor(
    scene: Phaser.Scene,
    private readonly onSelect: (slot: number, item: Slot) => void,
  ) {
    super(scene);
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const view = new SlotView(scene, i);
      view.zone.setInteractive({ useHandCursor: true });
      view.zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.select(i));
      this.views.push(view);
      this.add(view);
    }
    this.views[this.selected].setSelected(true);
    scene.add.existing(this);
  }

  /** What's in the selected slot now, or null. */
  get held(): Slot {
    return this.bag?.[this.selected] ?? null;
  }

  setBag(bag: Inventory | null) {
    this.bag = bag;
    this.views.forEach((view, i) => view.setSlot(bag?.[i] ?? null));
  }

  select(slot: number) {
    const next = ((slot % HOTBAR_SLOTS) + HOTBAR_SLOTS) % HOTBAR_SLOTS;
    if (next !== this.selected) {
      this.views[this.selected].setSelected(false);
      this.selected = next;
      this.views[next].setSelected(true);
      saveSelectedSlot(next);
    }
    this.onSelect(next, this.held);
  }

  /** Puts the hotbar's top-left corner at (x, y), with `size`-pixel slots `gap` apart. */
  layout(x: number, y: number, size: number, gap: number, showKeys: boolean) {
    this.setPosition(x, y);
    this.views.forEach((view, i) => view.resize(size, gap, showKeys).setPosition(size / 2 + i * (size + gap), size / 2));
  }

  /** Width in screen pixels for `size`-pixel slots `gap` apart. */
  static width(size: number, gap: number) {
    return HOTBAR_SLOTS * size + (HOTBAR_SLOTS - 1) * gap;
  }
}

/** The words shown above the hotbar for a moment when a slot is picked. */
export function slotName(slot: Slot): string {
  return slot ? ITEMS[slot.itemId].name : "";
}
