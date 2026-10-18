# Milestones 3 and 4 plan: the general store, houses and decorating

**Status:** built (2026-10-18); every step below landed, and `docs/reports/overnight-2026-10-18.md` has what to try.

Written 2026-10-18 by Claude, building autonomously ("I trust you with decisions"). Every decision is also in
DESIGN.md; this file is the short build plan.

**The evening this ships:** she walks up to the little green-roofed general store by the path, buys a sofa and a
potted plant with the crate money, walks up to the empty cottage in the meadow and taps **Move in**. Inside there's
a bed waiting. She taps **Place**, nudges the sofa under the window with the joystick, turns it, taps Place again.
You knock (tap **Visit** at her door) and see the new sofa. Later you both sleep in your own beds, and the night
starts as it always did.

## First: protect the real save

- `server/src/persistence/fixtures/world-v1.json`: a version 1 save with two farmers, crops, the crate, coins and a
  morning report. `oldSaves.test.ts` loads every `world-v<N>.json` at today's version, straight and through the
  SQLite store (which archives the original). Fixtures are never edited once committed.
- One format change for both milestones: **version 2** adds `houses: {}` and `decorations: []`. The migration
  (`migrations[0]`) only adds those, so every v1 save upgrades with nothing lost. `world-v2.json` gets committed
  with a house, furniture and decorations in it.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where is the store? | A small green-roofed shop (the pack's) just above the sandy path, two steps left of the seed stand, so the two make a little market. Action says **Shop** at its door; the card is the seed stand's card with furniture. | Same flow she already knows. |
| Does the store take over the seeds? | No. The seed stand stays (she knows it); the store sells furniture and farm decorations. | Less to relearn. |
| Interior: separate map or part of the village map? | **Part of the same Tiled map.** The map grows 10 rows at the bottom; each house's room is drawn there, below the sea, out of sight. Doors move you there and back. | Everything already works in one coordinate space: the server's position checks, reach, places, collision, interpolation (a teleport is already handled), and "who's where" is just "whose position is in that room". A separate map would need a second scene or map swapping, per-player map ids in the state, and filtering everywhere. |
| What does the camera show inside? | Just the room: the camera centres on it and everything around it is covered by the pack's dark background colour. Players only see people in the same place (the village, or one room). | |
| Which house is whose? | The meadow has two empty cottages. The first time a farmer walks up to a free one, Action says **Move in**; tapping it makes it theirs and puts a bed inside. After that their door says **Home** to them and **Visit** to anyone else. | The real save's farmers aren't known (a test farmer or two may exist), so handing out houses in join order could give a test farmer her house. Claiming is one cosy tap. |
| The migration "gives existing farmers an empty house" | Every v1 farmer can move into an empty house straight away (there's nothing to lose or convert). | See above. |
| Who's inside? | Over each cottage floats "Pip's house" and, while anyone's in, who ("Juno is visiting"). Inside you see whoever's in the room. | |
| Beds | A bed is furniture like any other (move it, turn it, put it away). Any bed works like the tent: Action says **Sleep** next to it. Sleepers vanish and a Zzz floats over the bed. The tent stays. | |
| Waking up | In a house (in bed, or caught by midnight indoors): where you are. Outdoors: in front of the tent, as before. | Nobody gets thrown out of their own house in the morning. |
| Furniture art | The pack's beds, furniture and house props (`TilesetElement`, `tileset_bed`, `TilesetHouse`), cut out by rectangle in `client/src/art/furnitureArt.ts`; a few seaside pieces of our own in `tools/sprites/`. | One artist. |
| Turning | Each piece lists the ways it can turn, each with its own footprint (a bed: upright 1×2, sideways 2×1, sideways the other way). Pieces the art only draws one way don't turn. | The pack draws most things from the front only. |
| Rugs | "Flat" pieces (rugs, mats, stepping stones) don't block walking, and other pieces can stand on them. | |
| Placement mode | **Arrange mode** (see below), one thumb or keys. | |
| Outdoor decorations | On any open walkable tile outside the farm field, not on the paths up to doors, the crate, the stands or the tent, and not where someone stands. Either player places or picks them up. | |

## Arrange mode (placing, turning, picking up)

- **Getting in:** hold a piece of furniture in the hotbar and tap Action (**Place**); or tap **Place** on it in the
  bag; or the **Arrange** button (a hammer, key F) next to the bag button, shown in your own house and outdoors.
- **In the mode:** your character stays put and the joystick (or WASD, arrows, mouse) moves a cursor one tile at a
  time over the grid. The camera follows the cursor outdoors.
  - Carrying a piece: it shows at the cursor, faded green where it fits and red where it doesn't. **Place**
    (Action, Space) puts it down, **Turn** (R) turns it, **Put away** (the bag button, B) puts it back in the bag,
    **Done** (Esc) stops (a lifted piece goes back where it was).
  - Not carrying: the cursor shows what's under it. **Lift** (Action) picks it up to carry, **Turn** turns it on
    the spot, **Put away** puts it straight in your bag.
  - Tapping a furniture slot on the hotbar carries that piece instead.
- Nothing changes on the server until Place, Turn or Put away; each is one message.

## Server

- World: `houses: Record<HouseId, { owner, furniture: PlacedPiece[] }>` (furniture in tiles from the room's
  floor corner, so moving the room in Tiled keeps it), `decorations: PlacedPiece[]` (map tiles).
  `PlacedPiece = { itemId, col, row, turn }`.
- Pure rules in `shared/decor/`: footprints, `canPlace`, place from the bag, move, put away, move in, beds.
- Messages (`server/src/rooms/decor.ts`, `houses.ts`): `moveIn`, `placePiece`, `movePiece`, `takePiece`.
  The server works out where you are from your position: in your own room, or outdoors.
- `buy` at the store goes through `trade.ts` like the seed stand, with the store's stock list in
  `shared/content/generalStore.ts`.

## Build order (each step: typecheck, tests, browser check, commit, push)

1. The v1 fixture (done first).
2. The furniture list and the general store.
3. Houses: cottages, rooms, doors, moving in, visiting, who's inside, beds and sleeping; save v2 and its fixture.
4. Arrange mode in your house: place, turn, lift, put away; furniture blocks walking.
5. Outdoor decorations with the same mode.
6. Seaside pieces of our own, tips, docs, the full two-player check, the report.
