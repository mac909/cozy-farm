import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { POSITION_SEND_MS, TILE_SIZE, WALK_SPEED } from "../../../shared/constants";
import type { MoveMessage } from "../../../shared/messages";
import { clampMove, type Facing, facingFor, type Vec } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { tileCenter } from "../../../shared/world/map";
import { BLOCKED_TILES } from "../../../shared/world/tiles";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { PLAYER_KEY, TILESET_KEY } from "../art/placeholderArt";
import { joinFarm } from "../net/connection";
import type { UIScene } from "./UIScene";

/** The camera picks the whole-number zoom that shows about this many tiles across the screen's shorter side. */
const TARGET_VISIBLE_TILES = 12;

type Direction = "up" | "down" | "left" | "right";

/** The village itself: map, characters, camera. */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private keys!: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private ui!: UIScene;
  private room: Room<FarmState> | null = null;
  private facing: Facing = "down";
  private lastSent = { x: NaN, y: NaN, facing: "down" as Facing, at: 0 };

  constructor() {
    super("world");
  }

  create() {
    const map = this.make.tilemap({ data: VILLAGE_MAP.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const ground = map.createLayer(0, tileset, 0, 0)!;
    ground.setCollision([...BLOCKED_TILES]);

    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, PLAYER_KEY);
    // Collide with the feet only, so characters can overlap the tops of trees.
    this.player.body.setSize(10, 5).setOffset(3, 10);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, ground);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player, true);
    this.fitZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this));

    const keyboard = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: [keyboard.addKey(K.W), keyboard.addKey(K.UP)],
      down: [keyboard.addKey(K.S), keyboard.addKey(K.DOWN)],
      left: [keyboard.addKey(K.A), keyboard.addKey(K.LEFT)],
      right: [keyboard.addKey(K.D), keyboard.addKey(K.RIGHT)],
    };

    this.scene.launch("ui");
    this.ui = this.scene.get("ui") as UIScene;

    void joinFarm((status) => this.registry.set("netStatus", status)).then((room) => {
      this.room = room;
      room?.onLeave(() => {
        this.room = null;
      });
    });
  }

  update(time: number) {
    const input = this.readInput();
    const move = clampMove(input.x, input.y);
    this.player.setVelocity(move.x * WALK_SPEED, move.y * WALK_SPEED);
    this.facing = facingFor(move.x, move.y, this.facing);
    if (move.x !== 0) this.player.setFlipX(move.x < 0);
    this.sendPosition(time);
  }

  /** The joystick wins while it's held; otherwise WASD or the arrow keys. */
  private readInput(): Vec {
    const stick = this.ui.joystick?.vector;
    if (stick && (stick.x !== 0 || stick.y !== 0)) return stick;
    const held = (dir: Direction) => (this.keys[dir].some((key) => key.isDown) ? 1 : 0);
    return { x: held("right") - held("left"), y: held("down") - held("up") };
  }

  private sendPosition(time: number) {
    if (!this.room || time - this.lastSent.at < POSITION_SEND_MS) return;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const { lastSent } = this;
    if (x === lastSent.x && y === lastSent.y && this.facing === lastSent.facing) return;
    const message: MoveMessage = { x, y, facing: this.facing };
    this.room.send("move", message);
    this.lastSent = { x, y, facing: this.facing, at: time };
  }

  private fitZoom() {
    const shortSide = Math.min(this.scale.width, this.scale.height);
    const zoom = Math.max(1, Math.round(shortSide / (TILE_SIZE * TARGET_VISIBLE_TILES)));
    this.cameras.main.setZoom(zoom);
  }
}
