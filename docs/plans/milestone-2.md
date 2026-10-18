# Milestone 2 plan: Farming

**Status:** steps 1–9 are built (2026-10-18), using the suggested answer to every open question; DESIGN.md has
the decisions and `docs/reports/overnight-2026-10-18.md` what to try. Step 10 (the real farm, the backup task) is
the developer's. The rest of this file is the plan as written.

A proposal from 2026-10-18. The mockups are in
[milestone-2-mockups.html](milestone-2-mockups.html): open it in a browser straight from the repo (it loads the real
sprites from `client/public/assets/`). The browser pane only shows local files as a snapshot without images, so
there, run `npm run dev` and open `http://localhost:5173/@fs/<path to the repo>/docs/plans/milestone-2-mockups.html`.

**The evening this ships:** she opens the home-screen app, taps her name, digs a few tiles by the tent, plants
radishes and waters them. You both crawl into the tent, and in the morning they've sprouted. Three days later she
picks them, drops them in the crate on the dock, wakes up to "The crate sold 4 Radish for 140", and buys
strawberry seeds with it.

**What this builds on**

- Merged rules, not wired up yet: `shared/farming/`, `shared/time/clock.ts`, `shared/content/crops.ts` and
  `items.ts`, `shared/inventory/`, `shared/economy/`, and the save layer in `server/src/persistence/`.
- The art work, merged on `main` as 7ee19e5: the Ninja Adventure art, 12 pack characters
  (`Look = { name, character }`), a music button next to the look button, and the village in Tiled at
  `shared/world/village.json` (48 × 36 tiles). `parseTiledMap()` in `shared/world/tiledMap.ts` reads its hidden
  `Collision` and `Farmland` layers and its `Objects` layer into a `WorldMap` (`shared/world/map.ts`):
  `farmland[][]`, the `spawn` tile, and the `shippingCrate` rectangle. The farm field is cols 4–19, rows 4–10
  (112 farmland tiles) inside a rail fence with a gate at cols 11–12; `spawn` is tile (12, 13), on the sandy path
  just below the gate; the crate is at tile (29, 26), where the dock starts. CLAUDE.md's "Editing the map" has the
  layer rules.

**Contents:** [1. How farming feels](#1-how-farming-feels) ·
[2. The rest of the game](#2-the-rest-of-the-player-experience) · [3. Server design](#3-server-design) ·
[4. Saving](#4-saving) · [5. Build order](#5-build-order) · [6. Open questions](#6-open-questions)

---

## 1. How farming feels

### The screens we design for

| Device | Screen (CSS px) | World zoom | One tile on screen |
|---|---|---|---|
| iPhone, upright | 390 × 844 (notch 47 at the top, home bar 34 at the bottom) | 2 | 32 px |
| iPhone, sideways | 844 × 390 (47 on the notch side, 21 at the bottom) | 2 | 32 px |
| Laptop | about 1280 × 800 | 4 | 64 px |

The zoom comes from `TARGET_VISIBLE_TILES = 12` in `WorldScene`. The number that shapes everything: **on a phone
a tile is 32 px, smaller than a fingertip** (about 44 px). Anything that asks her to hit one exact tile with a
finger will feel fiddly.

### Three ways to do it

**A. An Action button for the tile in front of you** (Animal Crossing, Dreamlight Valley, Stardew on a controller)

- Pick a tool or seeds in the hotbar. Walk up to the soil. The tile in front of your feet gets an outline. Tap the
  big Action button.
- One thumb: steer with the joystick, lift, tap Action in the bottom-right corner. Changing tools is one tap on
  the hotbar.
- Laptop: WASD to walk, Space to act, 1–8 for the hotbar. The same game, just keys.
- Good: one way of playing on every device. You always see which tile will change before you tap. It's how her
  favourite games already work. The server check is simple (is that tile next to you?).
- Not so good: lining up on one exact tile with a floating stick takes a little care at 32 px. Switching between
  the hoe, seeds and can is a tap each time.

**B. Tap the tile** (Stardew Valley on phones, Pocket Camp)

- Tap a tile next to your character and the item you're holding works there. Tap further away and you walk there.
- Good: very direct. Watering the eight tiles around you is eight quick taps without moving.
- Not so good: it fights the floating joystick, which already starts wherever the thumb lands; the game has to
  guess whether a touch is a tap or the start of a walk, and the stick flickers on every tap. The thumb covers the
  tile and the character. 32 px targets are below fingertip size. A laptop with a keyboard still needs scheme A,
  so we'd build two ways of playing.

**C. One smart button, no tool picking** (Dreamlight's auto-tool, taken further)

- One button whose job changes with what's in front of you: grass → dig, bare soil → plant, dry soil → water,
  ripe → pick. Which seed to plant comes from a small seed-pouch chip.
- Good: the least to learn. Nothing to select for most things.
- Not so good: it has to guess when more than one thing makes sense (bare dry soil: plant or water?). A wrong
  guess plants a seed you didn't mean to. The hoe and can in the bag stop meaning anything. Fishing and decorating
  later need item picking anyway, so the hotbar comes back.

| | A. Action button | B. Tap the tile | C. Smart button |
|---|---|---|---|
| One thumb, upright phone | Good | Good | Best |
| Hitting the tile you meant on 32 px tiles | Good (outline shows it first) | Fiddly | Good |
| Works with the floating joystick as it is | Yes | Needs tap-vs-drag guessing | Yes |
| Laptop keyboard | Same scheme | Needs scheme A too | Same scheme |
| Learned in a minute | Yes | Yes | Yes, until it guesses wrong |
| Still works for fishing and decorating later | Yes | Mostly | Needs a hotbar after all |
| Building it | Small | Medium | Small, plus tuning the guesses |

### Recommendation: A, borrowing the best bits of C and B

1. **The Action button says what it will do.** Its icon and one-word label change with the tile in front and
   what you're holding: Dig, Plant, Water, Pick. When nothing would happen, it fades. That's C's clarity without
   C's guessing.
2. **Ripe crops get picked with anything in hand.** The one "smart" rule that can't go wrong.
3. **Places take over the button.** Next to the tent it says Sleep, next to the crate Crate, next to the seed
   stand Seeds.
4. **Hold to repeat.** Keep Space held (or the button, with a second thumb when the phone is sideways) and walk:
   each new tile you face gets dug or watered. A row of soil in one stroke.
5. **Tapping or clicking a tile right next to you** (B, as a bonus) acts on that tile instead of the one in front.
   This comes in the feel pass at the end and stays only if it feels good on a real phone. On a laptop, clicking a
   neighbouring tile is natural and stays either way.

Mockups: **Recommended** section, upright phone, sideways phone and laptop.

### The upright phone screen

```
+------------------------------------------+
| Day 3  9:40 am                 (mus)(me) |  clock card, coins under it · music and look
|  640 coins                               |
|                                          |
|                 (world)                  |  the joystick still starts wherever the
|                                          |  thumb lands, unless that's a button
|            [ ] you                       |  [ ] = outline on the tile in front of you
|                                          |
|                                          |
| [bag]                (wave)(heart)(ACT)  |  bag · emotes · Action (76 px, says "Water")
| [hoe][can][rad7][car5][str3][rad4][ ][ ] |  hotbar: the first 8 bag slots
+------------------------------------------+
```

- **Hotbar:** 8 slots of 42 px with 3 px gaps (357 px), centred, 8 px above the home bar. Each slot shows the
  item's sprite at 2× and its count in the corner. The selected slot is lifted 4 px with a bright frame (the pack's
  `nine_path_focus`). Changing slot shows the item's name above the hotbar for 1.5 seconds.
- **Action:** a 76 px circle in the bottom-right corner, 12 px above the hotbar. Icon at 3×, its word on a small
  tag across the bottom of the circle. It's the biggest thing on screen, because it's the most used.
- **Emotes:** wave and heart stay one tap each, shrunk from 60 to 46 px, to the left of Action.
- **Bag:** a 52 px square button on the left, level with Action. Opens the bag screen.
- **Clock card:** top left inside the safe area: sun or moon, day, time, and coins underneath. The connection
  status folds into it: nothing while connected, "○ Reconnecting…" under the card when not. Today's
  "● Connected" label goes.
- **Top right:** music and look, as the art work leaves them.

The middle of the screen stays clear for the joystick, which is where a thumb rests anyway. 42 px slots are a
little under the 44 px guideline; that's fine, because picking the wrong slot costs nothing and the gaps count as
part of the nearest slot.

### Sideways phone and laptop

- **Sideways:** the hotbar sits bottom centre with 44 px slots (380 px). Action stays in the bottom-right corner,
  with wave and heart stacked above it (there's no room beside it). The bag goes bottom left. Most people steer
  with the left thumb and act with the right, so hold-to-repeat works while walking.
- **Laptop:** the same layout as sideways, with 48 px slots and key hints on everything: 1–8 on the slots, Space
  on Action, B on the bag, Z and X on the emotes. The Action button stays on screen (it teaches what Space does,
  and works with a mouse). When the mouse is over one of the 8 tiles around you, the outline moves there and a
  click acts on it, like Stardew on PC; otherwise the outline is the tile in front.

### Keyboard and mouse

| Key | Does |
|---|---|
| W A S D or arrows | Walk |
| Space (also Enter) | Action on the outlined tile. Hold while walking to repeat. |
| 1–8 | Pick a hotbar slot |
| Q / E, mouse wheel | Previous / next hotbar slot |
| B or Tab | Open or close the bag |
| Z / X | Wave / heart (moved from 1 and 2, which are hotbar keys now: see open questions) |
| Esc | Close whatever panel is open; get out of bed |
| Mouse click | On a tile next to you: act there. On a button: press it. |

### What the Action button shows

| When | Icon | Word |
|---|---|---|
| Next to the tent | tent | Sleep |
| Next to the shipping crate | crate | Crate |
| Next to the seed stand | seed packet | Seeds |
| The outlined crop is ripe (anything in hand) | that crop | Pick |
| Holding the hoe, outlined tile is farmland grass | hoe | Dig |
| Holding seeds, outlined tile is bare dug soil | that seed packet | Plant |
| Holding the can, outlined soil isn't watered yet | can | Water |
| None of these | what you're holding, faded | (none) |

The order of that table is the order of the checks. It becomes one pure function in `shared/`
(`chooseAction(tile, isFarmland, heldItem, nearby)`), so the button, the hints and the tests all agree.

Tapping the faded button gives a hint instead of nothing:

| Situation | Hint above your head |
|---|---|
| Hoe, not on farmland | You can only dig in the farm field. |
| Hoe on dug soil | Already dug. Plant some seeds! |
| Seeds or can on grass | Dig it with the hoe first. |
| Seeds where something grows | Something's already growing here. |
| Can on watered soil | Already watered today. |
| Anything on a growing crop | Radish: about 2 more watered days. |
| Picking with a full bag | Your bag is full. |
| Empty slot selected | Pick something from your hotbar. |

These hints are the tutorial. They show in a small speech bubble above your character, like the emote bubbles, for
2.5 seconds.

### The outline

Four white pixel corners around the target tile, gently pulsing; faint when the button is faded. The target is the
tile next to your feet in the direction you're facing (4 directions), so it moves as you turn. It shows only
while you hold a tool or seeds, or face something ripe, so walking around town stays clean. The corners are our
own 16×16 sprite in `tools/sprites/`.

### Making it feel instant

Through the Tailscale relay a round trip is 50–150 ms. On tap, the client plays everything that doesn't need the
server right away: the tool swing (the character sheets have three rows after the walk cycle that look like
attack and item poses), a sound, a puff of dirt or a splash. The tile itself changes when the server's update arrives a moment later. If the server
refuses, all that happened was a puff. No prediction or rollback code.

When the other player digs, waters or picks, you see the same puff or splash: the client plays it whenever a farm
tile changes, whoever changed it.

### Small touches for the feel pass

- Picking: the character holds the crop up for half a second and "+1 Radish" floats into the hotbar.
- Ripe crops bob slightly so you can spot them across the field.
- A light push on the joystick turns you on the spot without walking, so lining up is easy.
- Sounds from the pack's `Audio/Sounds` (dig, splash, pop, coins).

---

## 2. The rest of the player experience

### Who's playing (the first screen on a new device)

Bags belong to a farmer, not to a device. A phone that hasn't played yet, or the home-screen app the first time it
opens (it has its own storage), shows **Who's playing?**: a big button per farmer with their character's face and
name, and **Someone new** underneath. Tapping your name gets your own bag back. Someone new goes to today's name
and character picker. The device remembers the choice, so this shows only once. The look button still changes
your name and character later; the bag stays.

If the same farmer opens on a second device (the laptop while the phone app is still open), the newest one wins.
The older one shows "You're playing on another device" with a **Play here** button.

### Hotbar and bag

- The hotbar is the first 8 slots of your 24-slot bag (`HOTBAR_SLOTS`). Everyone starts with a hoe, a watering
  can and 10 radish seeds in the first three.
- The selected slot is remembered on the device. When the last seed in a slot is planted, the slot stays
  selected and empty (it doesn't jump to something else and surprise you).
- **The bag screen** (bag button, B or Tab): a card over the game with all 24 slots as 8 columns × 3 rows. The
  top row is the hotbar, marked as such, so it lines up with the bar below. Tap an item to select it: an info
  strip shows its name and what it sells for. Then tap another slot to move it there (swaps with what's there,
  joins a stack of the same thing). **Split** halves a stack. With a mouse, drag and drop works too. Coins show at
  the top. Close with ×, Esc or B.
- Tapping is the main way to move things rather than dragging: on a phone a drag starting on a 42 px slot is easy
  to fumble, and tap-then-tap can't drop anything by mistake.
- Time doesn't stop while the bag is open: it's shared time.

### Crops and soil

- Dug soil uses our `custom/soil.png`: each tile picks its frame from which neighbours are dug too (N 1, E 2, S 4,
  W 8), plus 16 for the darker watered version. So a dug patch has one soft border instead of a grid of squares.
- Crops use `custom/crops.png`, one frame per stage. They're drawn over the soil and under the characters.
- Overnight the soil dries out, so every morning shows which tiles need water.

### The day clock

- Top left: "☀ Day 3 · 9:40 am". It moves in 10-minute steps (`formatTime`), about every 8 seconds.
- From 6 pm the sun turns into a moon. From 10 pm the card turns amber and says "It's getting late". At 11:30 pm
  a hint says "Nearly midnight. Time for bed!"
- At midnight everyone online falls asleep where they stand: the night starts as if everyone went to bed, and you
  wake up by the tent. No penalty.
- A soft evening tint over the world after 6 pm is cheap and nice; full day and night lighting stays a later idea.

### Sleeping before houses exist: a tent

A tent just outside the farm gate, next to where you start (the pack's `tileset_camp.png` has one, 48 × 48 px). It belongs to both
of you until the houses come in Milestone 4. Then it can stay as a decoration or go.

- Walk up to the door: Action says **Sleep**. Tap it, and your character goes into the tent: they disappear and
  a "Zzz" bubble (the pack's `emote28`) floats over the tent.
- While you're in bed the screen dims, and a banner says "Sleeping… waiting for Juno" with a **Get up** button.
  Moving the joystick or pressing Esc gets you up too.
- Everyone wakes up in front of the tent in the morning.

### Everyone's in bed: the two-player flow

(Pip and Juno are stand-in names.)

1. Pip goes to bed. Juno's clock card gets a chip: "Pip is asleep", with the Zzz bubble. Time keeps going.
2. Juno keeps farming for as long as they like, then goes to bed too.
3. Everyone online is in bed, so the night starts: both screens fade to dark for a second.
4. Overnight: watered crops grow, the soil dries, the crate sells, the day number goes up, and the world is saved.
5. Both wake up in front of the tent and see the morning card.

| What happens | Then |
|---|---|
| You're alone and go to bed | The night starts right away. |
| Juno's phone locks or drops while Pip is in bed | The night waits 30 seconds in case Juno comes back, then starts. (The rule says everyone *online*; a locked phone isn't online.) |
| Pip's phone locks while Pip is in bed | Pip just isn't online. When Juno goes to bed, the night starts. Pip sees the morning card when the phone comes back. |
| Midnight | The night starts, whoever's still up. |
| Nobody online | Time doesn't pass, so nothing happens. |
| Someone's in bed and gets up | They're awake again; nothing else changes. |

### The morning card

A card over the screen after the fade:

> **Good morning! Day 4**
> 6 crops grew overnight. 3 are ready to pick.
> **The crate sold:** 4 Radish × 35 = 140 · 2 Carrot × 60 = 120
> **+260 coins**, now 900.
> [ Let's go ]

A quiet night just says "Good morning! Day 4". The server keeps the last morning's report, so whoever was offline
sees it when they next open the game (the device remembers which day it last showed).

### The shipping crate (see open question 1)

- On the dock, where the art work already puts it. Walk up: Action says **Crate**, and a tap opens the crate card.
- Top half: what's in the crate (from both of you), with "Sells tonight for 260". Bottom half: your bag, with
  things that can't be sold (the hoe and can) faded.
- Tap a stack in your bag to put the whole stack in. Tap a line in the crate to take it back out. Partial amounts
  aren't needed yet; split the stack in the bag first if you want to keep some.
- It sells overnight at that night's prices, and the morning card says what sold.

### The seed stand (see open question 1)

- A small stand at the top of the beach path, between the farm and the dock. Walk up: Action says **Seeds**.
- The card lists the six seeds: packet, name, "Ripe in 3 days", "Sells for 35", and the price. Tap a seed to open
  it, choose how many with − and + (or 5 and 10), and **Buy 5 for 100**. The button says why when you can't:
  "Need 20 more coins" or "Your bag is full".
- Seeds only for now. Tools never get lost, and furniture has nowhere to go until Milestone 4.

### Not in Milestone 2

Digging up a crop you don't want, tool upgrades, an energy bar, refilling the watering can (it never runs dry),
furniture, houses, real day and night lighting, seasons, weather.

---

## 3. Server design

### Who is who: farmers

Today a player is a Colyseus session, and a reconnect is a new session. Bags have to survive reconnects, restarts
and switching devices, so the world gets **farmers**, each with an id, a name, a character and a bag.

- `GET /api/farmers` on the game server lists them (id, name, character) for the Who's playing screen. In dev,
  Vite proxies `/api` to port 2567 (a few lines in `vite.config.ts`).
- The device keeps `farmerId` in localStorage next to the look, and sends it in the join options.
- No `farmerId` (Someone new): the server makes one and sends it back in a `you` message. The server makes ids,
  not the client: `crypto.randomUUID()` doesn't exist on plain `http://` pages like
  `http://100.82.139.111:8080`.
- A `farmerId` the server doesn't know (a dev save that was wiped, a restored older backup): the server makes that
  farmer with the look from the join and a starter bag, instead of refusing.
- The same farmer joining twice: the server sends the older client `replaced` and disconnects it with code 4001.
  `connection.ts` must not reconnect after 4001, or two devices would knock each other off forever.

### The world in memory

The room keeps a plain `World` object as the source of truth. It has the same shape as the save, and the pure
rules work on it directly. After each change the room copies the changed parts into the Colyseus state for the
clients. The save is written from `World`, never from the network state.

```ts
// shared/world/world.ts
interface World {
  clock: GameClock;                               // shared/time/clock.ts
  coins: number;                                  // shared/economy/wallet.ts
  crate: Crate;                                   // shared/economy/shop.ts
  farm: Record<TileKey, FarmTile>;                // "col,row"; missing = untouched grass
  farmers: Record<FarmerId, Farmer>;
  lastMorning: MorningReport | null;              // for whoever missed it
}
interface Farmer { name: string; character: CharacterId; bag: Inventory }
```

The world is loaded once when the server starts (in `server/src/index.ts`, before it listens) and lives in a small
module the room imports. It isn't passed through `gameServer.define()` options, because Colyseus mixes the joining
client's options into those. The room is created at startup with `autoDispose = false`, so the clock and the farm
live in one place for as long as the server runs.

### Schema additions (`shared/schema.ts`)

```ts
export class BagSlot extends Schema {
  @type("string") itemId = "";     // "" = empty (ArraySchema can't hold null well)
  @type("uint16") count = 0;
}
export class FarmPlot extends Schema { // one dug tile
  @type("string") kind = "tilled"; // "tilled" | "planted"
  @type("boolean") watered = false;
  @type("string") cropId = "";
  @type("uint8") stage = 0;
  @type("uint8") daysInStage = 0;  // for the "about 2 more days" hint
}
export class CrateEntry extends Schema {
  @type("string") itemId = "";
  @type("uint32") count = 0;
}
export class Clock extends Schema {
  @type("uint32") day = 1;
  @type("uint16") minute = 360;    // rounded down to the HUD's 10-minute step, so it only syncs when the HUD changes
}

export class Player extends Schema {
  // …x, y, facing, sentAt, name, character as now…
  @type("string") farmerId = "";
  @type("boolean") inBed = false;
  @type([BagSlot]) bag = new ArraySchema<BagSlot>(); // 24 slots, copied from the farmer on join
}

export class FarmState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Clock) clock = new Clock();
  @type("uint32") coins = 0;
  @type({ map: FarmPlot }) farm = new MapSchema<FarmPlot>(); // key "col,row"
  @type([CrateEntry]) crate = new ArraySchema<CrateEntry>();
}
```

- The farm is a map of only the dug tiles, since dug soil never goes back to grass. Each change syncs one tile.
- Everyone's bag is visible to everyone. That's fine for two trusted players and costs nothing (two bags of 24).
- Converting between `FarmPlot`/`BagSlot` and the rules' `FarmTile`/`Slot` goes in a small file next to the
  schema, with tests. The rules themselves stay free of Colyseus.

### Messages

Client → server. Every handler checks types and bounds, then hands the rest to the pure rules, which already
refuse anything that doesn't make sense.

| Message | Data | Server checks | Rule it calls |
|---|---|---|---|
| `till` | `{col, row}` | whole numbers on the map; farmland; within reach; has a hoe | `till` |
| `plant` | `{col, row, slot}` | as above, a dug tile; `isSlotIndex`; that slot holds seeds | `plant`, then `removeFromSlot(bag, slot, 1)` |
| `water` | `{col, row}` | a dug tile within reach; has a watering can | `water` |
| `harvest` | `{col, row}` | a dug tile within reach; `roomFor(bag, crop) >= amount` | `harvest`, then `addItems` |
| `moveItem` | `{from, to}` | `isSlotIndex` both | `moveSlot` |
| `splitStack` | `{from, count, to?}` | `isSlotIndex`, `isCount` | `splitStack` |
| `sleep` | `{}` | near the tent | sets `inBed`, then checks for the night |
| `wake` | `{}` | in bed | clears `inBed` |
| `ship` | `{slot, count}` | near the crate | `shipItems` |
| `unship` | `{itemId, count}` | near the crate | `takeFromCrate` |
| `buy` | `{itemId, count}` | near the stand; the stand sells it; count 1–99 | `buy` |
| `dev` | `{command, value?}` | only when `NODE_ENV` isn't `production` | next day, set the time, add coins |

- Messages name the action ("water tile 12,4"), as the rules in CLAUDE.md say, rather than "use my item here". If
  the other player picked a crop a moment earlier, a late `harvest` just fails; it can't turn into planting a
  seed by accident.
- **Within reach** means the tile is at most 2 tiles from the tile under your feet, using your last reported
  position. On screen you can only reach the 8 tiles around you; the extra tile covers lag.
- **Near** a place (tent, crate, stand) means within 2.5 tiles of its rectangle in the map's `Objects` layer
  (`shippingCrate` is already a rectangle; `tent` and `seedStand` are drawn the same way). The client switches
  the Action button at 1.5 tiles.
- Nothing is rate-limited. Two trusted players.

Server → client:

| Message | Data | When |
|---|---|---|
| `you` | `{farmerId}` | after joining as someone new |
| `hint` | `{reason}` | an action failed for a reason the client couldn't see coming (bag full, someone else just did it). The client turns the reason into the hint text. |
| `morning` | `MorningReport` | when the night ends, to everyone; and on join, so whoever missed it can catch up |
| `wakeUp` | `{x, y}` | when the night ends: each client moves its own character there (clients own their position) |
| `replaced` | `{}` | just before disconnecting an older device of the same farmer |

### Where each merged rule plugs in

| Rule | Used by |
|---|---|
| `farming.till`, `plant`, `water`, `harvest` | the four farm message handlers |
| `farming.advanceTile` | the night, over every dug tile |
| `farming.isRipe`, `ripeStage`, `daysToRipe` | the Action button, hints, the morning count |
| `clock.tickClock` | the room's simulation interval, only while someone is connected |
| `clock.shouldEndDay`, `isMidnight`, `nextDay` | after every tick, `sleep`, `wake` and leave |
| `clock.formatTime`, `HUD_MINUTE_STEP` | the clock card; the schema clock is rounded to the step |
| `crops.CROPS`, `isCropId` | sprite frames, the stand's "Ripe in 3 days", checking ids in saves |
| `items.ITEMS`, `isItemId`, `seedItemId`, `cropItemId` | message checks, item names and sprites, save checks |
| `inventory.starterInventory` | each new farmer |
| `inventory.removeFromSlot`, `addItems`, `roomFor`, `countOf` | planting, picking, "has a hoe" |
| `inventory.moveSlot`, `splitStack`, `isSlotIndex`, `isCount` | the bag screen |
| `wallet.STARTING_COINS` | a new world |
| `shop.buy`, `SHOP_STOCK` | the seed stand (seeds only, as a list in `shared/content/`) |
| `shop.shipItems`, `takeFromCrate`, `settleCrate` | the crate; `settleCrate` runs in the night |
| `persistence.SaveStore`, `WORLD_SAVE`, `resolveDataDir` | loading at startup and saving (next section) |
| `persistence.SaveLoadError` | at startup: log it and exit, never start a fresh world over a save |

### New pure code in `shared/` (with tests)

- `world/world.ts`: the `World` type, `newWorld()`, `addFarmer()`.
- `farming/actions.ts`: `chooseAction` (the Action button table), `hintFor` (the hint table), `targetTile(feet,
  facing)`, `inReach`, `daysLeft(tile)`, and `applyFarmAction(world, farmerId, action, col, row, slot)`, which
  joins the farming and bag rules (plant takes the seed, picking needs room in the bag).
- `world/night.ts`: `endNight(world)` returns the next morning's world and a `MorningReport { day, grew, ready,
  sale }`: advance every tile, settle the crate, next day.
- `world/places.ts`: `nearPlace(position, rect, distance)` for the tent, crate and stand rectangles from the map,
  and `wakeSpots(tent)`: the two tiles in front of the tent's door, where everyone wakes up.
- The map gains two more `Objects` rectangles, `tent` and `seedStand`: found by name with the `one()` helper in
  `parseTiledMap` (it ignores unknown objects today), added to `WorldMap` in `shared/world/map.ts`, and reached by
  the "lets you walk up to the shipping crate" flood-fill test in `shared/world/map.test.ts`.

### The clock in the room

- `setSimulationInterval(dt => tick(dt), 250)`. A tick does nothing with nobody connected, so time only passes
  while someone plays.
- After each tick the room rounds the minute down to the 10-minute step and writes it into the schema only when it
  changes, so clients get a clock update about every 8 seconds instead of 20 times a second.
- Checking for the night: `shouldEndDay(clock, inBed)`, where `inBed` has one entry per player online plus a
  `false` for each farmer who dropped while awake in the last 30 seconds.

### The night, step by step (all on the server, in one go)

1. `const { world, report } = endNight(world)`: crops grow, soil dries, the crate sells, the clock moves to 6 am
   on the next day.
2. Copy the farm, coins, crate and clock into the schema. Everyone's `inBed` goes back to false.
3. Save now.
4. Send everyone `morning` and their own `wakeUp` spot in front of the tent (two spots side by side, so you don't
   stand on each other).

Node runs this without interruption, so the save on disk is either the whole evening or the whole morning, never
half of each.

---

## 4. Saving

### When to save

- **2 seconds after anything changes**: a dug tile, a bag, coins, the crate, or the clock's 10-minute step. While
  someone plays that's a save about every 8 seconds; with nobody online the world doesn't change, so nothing is
  written. A save is a few kilobytes of JSON in one SQLite transaction, so this costs nothing noticeable.
- **Right away** at the end of a night, when the last player leaves, and when the server shuts down (`docker stop`
  sends SIGTERM; the handler saves and calls `store.close()`). `node:sqlite` is synchronous, so the save
  finishes before the process exits.
- **If a save fails** (disk full, say): log it loudly and keep playing; the next change tries again. The world in
  memory is still fine.

### Loading on start

In `server/src/index.ts`, before listening:

```ts
const store = new SaveStore(resolveDataDir(), WORLD_SAVE);
const loaded = store.load(WORLD_ID);   // throws SaveLoadError: let it crash, never catch-and-start-fresh
const world = loaded.status === "loaded" ? loaded.save : newWorldSave();
```

- No save yet (the very first start, or a fresh dev folder): a new world (day 1, 6 am, 500 coins, empty farm, no
  farmers), saved straight away so the first backup has something in it.
- A save that won't load: the server logs why and exits, as CLAUDE.md requires. Docker's restart policy then keeps
  failing loudly instead of quietly starting a new farm over the old one; `npm run farm:restore` is the fix.
- Farm tiles outside today's `Farmland` layer (you moved the field in Tiled) are kept as they are. A map edit
  should never make a save fail.

### Dev save and real save

| | Dev (`npm run dev`) | Real farm (Docker) |
|---|---|---|
| Server port | 2567 (Vite on 5173) | 8080 |
| Save folder | `data-dev/` in that checkout (gitignored); every worktree has its own | the `farm-data` volume at `/app/data` |
| How it's chosen | `DATA_DIR` unset, so `resolveDataDir()` picks `data-dev/` | `docker-compose.yml` sets `DATA_DIR`; production refuses to start without it |
| Start over | delete `data-dev/` (step 2 adds `npm run dev:fresh` for it) | never; restore a backup instead |
| Dev commands | on (next day, set time, add coins) | refused by the server |

### Save format, version 1

Version 1 today is a placeholder (`{version, day}`) that has never been written anywhere real, so it gets reshaped
freely until the first `npm run farm:up` with saving in it. From that moment it's frozen.

```ts
interface WorldSave {
  version: number;                       // 1
  clock: { day: number; minute: number };
  coins: number;
  crate: { itemId: string; count: number }[];
  farm: ({ col: number; row: number } & FarmTile)[];   // dug tiles only
  farmers: Record<string, {
    name: string;
    character: string;
    bag: ({ itemId: string; count: number } | null)[]; // exactly 24
  }>;
  lastMorning: MorningReport | null;
}
```

`WORLD_SAVE.validate` checks every field strictly: whole numbers in range, known crop and item ids, counts from 1
to the item's stack size, 24 bag slots. A save that fails the check stops the server, which is what catches a
broken migration before it can do damage. Names and characters go through `lookFrom()` instead of failing, so an
odd name never blocks the farm.

While Milestone 2 is being built, dev saves from an older shape fail that check. That's expected: delete
`data-dev/` and carry on.

### Migrations after that

- Every change to the shape from then on is a migration in `worldSave.ts` (version 1 → 2 is `migrations[0]`),
  never an edit to an old one. `SaveStore` already keeps the pre-upgrade copy in `save_archive`.
- When version 1 ships, commit a sample save as `server/src/persistence/fixtures/world-v1.json` with a test that
  it loads at the current version. Each later version adds its own fixture, so every old save shape stays tested
  forever.
- Renaming or removing a crop or item id is a migration too (it rewrites bags, the crate and the farm).
- Likely next ones: houses and furniture (Milestone 4), beach finds (Milestone 5), more bag slots (pad each bag
  with empty slots).

### When the server restarts mid-day

- `npm run farm:up` or `docker stop`: the shutdown save catches everything. The clock picks up at the same minute.
- A crash: at most the last 2 seconds of changes are lost (one dug tile, say).
- Players see "Reconnecting…" and rejoin by themselves with their `farmerId` and where they stood, so their bag and
  position come straight back.
- Anyone in bed is awake again after a restart and taps Sleep again. Nobody gets stuck waiting.
- A restart at midnight: the save says midnight, so the night starts on the first tick after someone rejoins.

---

## 5. Build order

Each step ends with something to try in the browser, except step 1, which is rules and tests only. The art work is
on `main`, so every step starts from there.

| Step | What players get | Main files | Can run alongside |
|---|---|---|---|
| 1 | (nothing visible: the rules that join everything up) | new files in `shared/farming/`, `shared/world/` | step 2 |
| 2 | The day clock, saved and restored | `shared/schema.ts`, `server/src/index.ts`, `FarmRoom.ts`, `worldSave.ts`, `UIScene.ts` | step 1 |
| 3 | Who's playing, your own bag, the hotbar | `connection.ts`, new `FarmerPicker.ts`, `UIScene.ts`, `FarmRoom.ts`, `index.ts`, `vite.config.ts` | nothing (it touches everything) |
| 4 | Dig, plant, water, pick | `WorldScene.ts`, `UIScene.ts`, new `client/src/world/Farm.ts`, `server/src/rooms/farming.ts` | step 6 |
| 5 | The tent, sleeping, the night, the morning card | `village.json`, `tiledMap.ts`, `map.ts`, `UIScene.ts`, `WorldScene.ts`, new `MorningCard.ts`, `server/src/rooms/night.ts` | step 6 |
| 6 | The bag screen | new `client/src/ui/BagPanel.ts` + `bag.css`, `server/src/rooms/bag.ts` | steps 4 and 5 |
| 7 | The shipping crate and coins | new `CratePanel.ts`, `server/src/rooms/crate.ts`, `MorningCard.ts` | step 8 |
| 8 | The seed stand | `village.json`, `tiledMap.ts`, `map.ts`, new `ShopPanel.ts`, `server/src/rooms/shop.ts` | step 7 |
| 9 | The feel pass | `WorldScene.ts`, `UIScene.ts`, sounds | nothing |
| 10 | It's on the real farm | docs, a fixture test, `farm:up`, the backup task | nothing |

**To keep parallel steps apart:** each feature's message handlers go in their own file under
`server/src/rooms/` (registered with one line in `FarmRoom.ts`), each panel gets its own CSS file imported from
its TypeScript instead of adding to `index.html`, and each feature's message types get their own section in
`shared/messages.ts`. Then two sessions only meet in one-line additions, which merge easily. `UIScene.ts` is the
one shared hot spot, so steps that change the HUD (2, 3, 4, 5, 9) go one at a time.

**Checks for every step:** `npm run typecheck` and `npm test`; then the browser pane with two tabs
(http://localhost:5173 and http://127.0.0.1:5173, each its own farmer), looking at both tabs; then the mobile
viewport (375 × 812) for the touch layout; then a server restart (save a server file, `tsx watch` restarts it) to
check that whatever the step added comes back. The dev commands are also reachable from the browser console
(`window.dev.nextDay()`), so checks don't have to wait for crops to grow.

### Step 1: Rules that join everything up (shared, pure)

- `World`, `newWorld`, `addFarmer`; `chooseAction` and `hintFor`; `targetTile`, `inReach`, `daysLeft`;
  `applyFarmAction`; `endNight` with the morning report; `nearPlace`; the seed stand's stock list in
  `shared/content/`.
- Checks: tests for every row of the Action-button and hint tables; plant takes exactly one seed; picking with a
  full bag changes nothing; a regrowing crop picked twice; `endNight` grows only watered crops, dries the soil,
  sells the crate and counts what grew and what's ripe.
- About an hour. New files only, so it can't collide with anything.

### Step 2: The clock, saved and restored

- Reshape `WorldSave` version 1, with its `validate` and tests. Load at startup; the world module; save 2 seconds
  after changes, at shutdown and when the last player leaves. The clock ticks only while someone's connected and
  syncs in 10-minute steps. Dev commands. `npm run dev:fresh`.
- HUD: the clock card in the top left, with the connection status folded in.
- Checks in the browser: the card says "Day 1 · 6:00 am" and moves every ~8 seconds in both tabs. Close both tabs
  for a minute and reopen: the clock hasn't moved. Restart the dev server: it picks up where it was.
  `data-dev/saves.sqlite` exists. A deliberately broken save makes the server stop with a clear message. The real
  farm on :8080 is untouched.

### Step 3: Who's playing, your own bag, the hotbar

- Farmers in the world; `GET /api/farmers` and the Vite proxy; `farmerId` in the join and in localStorage; the
  `you` and `replaced` messages; no reconnecting after code 4001; the Who's playing screen ahead of the look
  picker.
- Each player's bag in the schema. The hotbar in `UIScene`: 8 slots, sprites and counts, picking with taps, 1–8,
  Q/E and the wheel, remembered on the device. The emotes move to Z/X and shrink. The bag button (it can open an
  empty card until step 6).
- Checks: tab 1 picks Someone new and sees the hoe, can and 10 radish seeds. Tab 2 sees tab 1's farmer in the list,
  picks Someone new, and gets its own bag. Restart: both bags come back. A third tab that picks tab 1's farmer
  sends tab 1 to "You're playing on another device", and Play here swaps back. The hotbar fits in the mobile
  viewport without overlapping the emotes.

### Step 4: Dig, plant, water, pick

- The outline on the target tile; the Action button with its icon, word and fading; Space; mouse clicks on
  neighbouring tiles. The `till`, `plant`, `water` and `harvest` handlers with their checks. Soil and crops drawn
  from the farm state (soil frames from the neighbour mask). Hints. The instant swing, puff and splash. "+1 Radish".
- The `Farmland` layer says where digging works.
- Checks: in tab 1, dig, plant and water a few tiles; tab 2 sees each change with its puff or splash. The dev
  "next day" makes them grow; once ripe, Action says Pick with the hoe selected; the radish lands in the bag. A
  full bag says so and leaves the crop. Digging outside the field gives the hint. Restart: the field is as it
  was. In the mobile viewport, line up and water a row with the joystick alone.

### Step 5: The tent, sleeping, the night, the morning

- The developer places the tent in Tiled: its 48 × 48 sprite in `Decor`, `Collision` painted under its bottom row
  (otherwise you get invisible walls or walk through it), and a `tent` rectangle in `Objects`. `parseTiledMap`
  and `WorldMap` learn `tent`. `sleep` and `wake`; hiding the sleeper and the Zzz bubble; the dimmed screen with Get up; the
  "Pip is asleep" chip; the night as in section 3; the 30-second wait; midnight; the evening tint, the moon and
  the late-night warnings; the morning card with the growth line; `lastMorning` for whoever missed it.
- Checks: one tab alone, Sleep starts the night at once. Two tabs: tab 1 sleeps, tab 2 sees the chip and the clock
  keeps going; tab 2 sleeps and both get the card and wake by the tent. Close tab 2 while tab 1 sleeps: the night
  starts after 30 seconds. Set the time to 11:50 pm: the warning, then midnight starts the night. Close a tab
  before a night and reopen it after: it gets the morning card.

### Step 6: The bag screen

- The 8 × 3 card, the hotbar row, tap to select, tap to move, split, drag with a mouse, the info strip, B/Tab/Esc.
  The `moveItem` and `splitStack` handlers.
- Checks: move a tool out of the hotbar and back; split the seeds; join two stacks; restart and it's all still
  there; on the mobile viewport the card fits with nothing cut off; keys don't walk the character while it's
  open.
- It only needs step 3, so it can run next to steps 4 and 5.

### Step 7: The shipping crate and coins

- Coins on the clock card. The crate card (the map already has the `shippingCrate` rectangle); `ship` and
  `unship`; `settleCrate` in the night; the sale lines on the morning card.
- Checks: tab 1 puts radishes in; tab 2 sees them in the crate and "Sells tonight for…"; take some back; the hoe
  can't go in. After the night, both tabs show the same coins and the same sale lines.

### Step 8: The seed stand

- The developer places the stand in Tiled (its sprite, `Collision` under it, a `seedStand` rectangle), and
  `parseTiledMap` learns it. The seeds card with − / +, 5 and 10; `buy`.
- Checks: buy some seeds and see the coins drop in both tabs; try to buy more than the coins allow; fill the bag
  and see "Your bag is full".
- Steps 7 and 8 only meet in `shared/messages.ts` and `FarmRoom.ts` one-liners, so they can run side by side.

### Step 9: The feel pass

- Hold to repeat; tapping a neighbouring tile on the phone (kept only if it feels good); turning on the spot;
  ripe crops bobbing; sounds; slot and button sizes checked on a real iPhone by the developer, upright and
  sideways; first-day tips if wanted (open question 9).

### Step 10: On the real farm

- The v1 fixture and its test. DESIGN.md, ROADMAP.md, README (controls) and CLAUDE.md (dev commands, `dev:fresh`)
  brought up to date.
- `npm run farm:up` (it disconnects anyone playing, so ask first). Check on a phone over Tailscale: who's playing,
  farm a little, restart the container, and it's all still there.
- The nightly backup: create the scheduled task from the command in `scripts/backup-farm.ps1` (the developer
  approves it), run it once, and check the copy loads with `npm run farm:restore`'s check.

---

## 6. Open questions

Each has a suggested answer. Say the word and it goes into DESIGN.md.

1. **Should Milestone 2 include the shipping crate and a seed stand?** Without them, the 10 starting radish
   seeds are all she'll ever plant, and the radishes pile up with nothing to do. The rules are already written.
   *Suggested: yes, both, as steps 7 and 8. Milestone 3 then becomes the real general store with furniture.*

2. **Should bags follow the farmer instead of the device, with a Who's playing screen on new devices?** Otherwise
   her phone app and her laptop would each have their own bag, and the home-screen app would start a new one.
   *Suggested: yes. If the same farmer opens on two devices, the newest one wins.* (A simpler fallback: typing the
   same name gets the same bag back. Less tapping to build, more typing for her.)

3. **Where do you sleep before the houses: a shared tent by the farm?** *Suggested: yes, the pack's tent next to
   where you start. It can stay as a decoration later.*

4. **Can the emote keys move from 1 and 2 to Z and X?** Number keys 1–8 are what every game uses for the hotbar.
   Phones don't change. *Suggested: yes.*

5. **Pick ripe crops whatever you're holding?** And should the game ever switch tools for you (holding seeds,
   facing dry soil, so it waters)? *Suggested: picking, yes. Switching tools, not at first: see how she plays.*

6. **Will she hold the phone upright or sideways?** Both will work; the design starts from upright, with one
   thumb. *Suggested: ask her, or watch the first evening.*

7. **If one of you is in bed and the other's phone locks, should the night wait?** The rule says everyone online
   is in bed, and a locked phone drops offline. *Suggested: wait 30 seconds, then start the night.*

8. **The watering can never runs dry, and there's no energy bar. OK?** It fits "no stress". *Suggested: yes.*

9. **A few one-time tips on her first day?** For example: "Pick the hoe and tap the big button on the grass",
   "Water your seeds every day", "The tent ends the day". *Suggested: yes, three or four, each shown once.*

10. **Where do the tent and seed stand go?** You place them in Tiled. *Suggested: the tent on the open grass
    just left of where you start (about cols 7–9, rows 12–14, door facing down, a few steps from the field gate);
    the seed stand beside the path where it reaches the beach, so seeds are on the way back from the crate at the
    dock.*

11. **Digging up a crop you don't want: still not decided.** Crops never die, so a wrong one just ripens.
    *Suggested: leave it out of Milestone 2 and add it if she asks for it.*

---

## Doc updates along the way

- **DESIGN.md:** a Controls section (the Action button, the hotbar, the keys), Who's playing, the tent, the
  bedtime flow and the 30-second wait, the morning card; the answers to the open questions; the choices the rule
  sessions made but couldn't write down (in their hand-over notes: growth and regrow details, soil stays dug
  forever, one player alone can end the day).
- **ROADMAP.md:** if open question 1 is a yes, move "Shipping crate and shared wallet" and seed buying into
  Milestone 2. Tick items as their steps land.
- **CLAUDE.md:** the dev commands and `npm run dev:fresh`; the farmer id rule (made by the server, kept on the
  device).
- **README.md:** the controls, and that a new device asks who's playing.
